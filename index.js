'use strict';

const express = require('express');
const { trace, context } = require('@opentelemetry/api');

const app = express();
const PORT = 3000;
const tracer = trace.getTracer('my-application-tracer');

// --- Mock Data ---
// A simple in-memory object to simulate a multi-tenant database.
const tenantData = {
  'tenant-a': {
    name: 'Tenant A',
    devices: [
      { id: 'dev1-A', ip: '10.0.0.1', type: 'switch', status: 'online' },
      { id: 'dev2-A', ip: '10.0.0.2', type: 'router', status: 'offline' }
    ]
  },
  'tenant-b': {
    name: 'Tenant B',
    devices: [
      { id: 'dev1-B', ip: '192.168.1.1', type: 'firewall', status: 'online' },
      { id: 'dev2-B', ip: '192.168.1.2', type: 'switch', status: 'online' }
    ]
  }
};

// --- Middleware for Multi-Tenancy and OpenTelemetry ---
// This middleware extracts the tenant ID and attaches it as a span attribute.
// It also makes the tenant ID available to downstream handlers.
const tenantMiddleware = (req, res, next) => {
  // Get the current span from the context.
  const currentSpan = trace.getSpan(context.active());
  // Extract tenant ID from a custom header.
  const tenantId = req.headers['x-tenant-id'] || 'unknown-tenant';

  // Set the tenant.id as a span attribute.
  if (currentSpan) {
    currentSpan.setAttribute('app.tenant.id', tenantId);
  }

  // Attach the tenantId to the request object for use in other routes.
  req.tenantId = tenantId;
  next();
};

app.use(tenantMiddleware);

// --- Fabric Discovery Route ---
// This route simulates discovering devices for a specific tenant.
app.get('/api/v1/fabric/discover', (req, res) => {
  const tenantId = req.tenantId;

  // Use the tracer to create a new span for this operation.
  const parentSpan = trace.getSpan(context.active());
  const childSpan = tracer.startSpan('fabric.discover', { parent: parentSpan });

  console.log(`Discovering fabric for tenant: ${tenantId}`);
  
  // Simulate fetching data from a database based on tenantId
  const tenant = tenantData[tenantId];
  if (!tenant) {
    childSpan.setStatus({ code: 2, message: `Tenant ID not found: ${tenantId}` });
    childSpan.end();
    return res.status(404).json({ error: 'Tenant not found' });
  }

  // Simulate some async work
  setTimeout(() => {
    // Add an event to the span to record an important point in time.
    childSpan.addEvent('Devices fetched from mock database');
    const devices = tenant.devices;

    // Simulate returning telemetry data
    const telemetryData = {
      tenantId: tenantId,
      devices: devices.map(device => ({ id: device.id, status: device.status }))
    };

    childSpan.end();
    res.json(telemetryData);
  }, 1000); // Simulate a network delay
});

// --- Simple Root Route ---
app.get('/', (req, res) => {
  const currentSpan = trace.getSpan(context.active());
  if (currentSpan) {
    currentSpan.addEvent('Root endpoint accessed');
  }
  res.send('Multi-tenancy telemetry service is running!');
});

// --- Server Startup ---
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log('Use `curl -H "X-Tenant-ID: tenant-a" http://localhost:3000/api/v1/fabric/discover` to test!');
});
