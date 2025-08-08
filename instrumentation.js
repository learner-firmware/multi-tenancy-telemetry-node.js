```javascript
// File: instrumentation.js
// This file sets up the OpenTelemetry SDK before the main application starts.

'use strict';

const opentelemetry = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { ConsoleSpanExporter } = require('@opentelemetry/sdk-trace-node');

// --- Configuration ---
// The service name identifies your application within the observability system.
const serviceName = 'multi-tenant-telemetry-service';

// The SDK is configured here.
const sdk = new opentelemetry.NodeSDK({
  serviceName: serviceName,
  traceExporter: new ConsoleSpanExporter(), // Use a console exporter for demonstration
  instrumentations: [getNodeAutoInstrumentations()], // Automatically instrument common libraries like http and express
});

// Gracefully shut down the SDK on process exit.
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error) => console.log('Error terminating tracing', error))
    .finally(() => process.exit(0));
});

// Start the SDK to begin collecting telemetry data.
sdk.start();
