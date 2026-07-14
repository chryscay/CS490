import express from 'express';
import request from 'supertest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiError, asyncHandler, errorHandler } from './middleware/error.middleware.js';

describe('ApiError', () => {
  it('carries a statusCode and an optional cause for centralized logging (S3-BR-019)', () => {
    const cause = new Error('upstream provider timeout');
    const error = new ApiError(502, 'Failed to generate draft', { cause });

    expect(error.statusCode).toBe(502);
    expect(error.message).toBe('Failed to generate draft');
    expect(error.cause).toBe(cause);
  });
});

describe('errorHandler (S3-BR-019 centralized error handling/logging)', () => {
  let consoleErrorSpy;
  let app;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    app = express();
    app.get('/api-error', () => {
      throw new ApiError(409, 'A document is already linked');
    });
    app.get('/unexpected-error', () => {
      throw new Error('db connection reset');
    });
    app.get('/wrapped-ai-error', () => {
      throw new ApiError(502, 'Failed to generate company research', {
        cause: new Error('provider 503'),
      });
    });
    app.get('/async-thrown', asyncHandler(async () => {
      throw new Error('async failure');
    }));
    app.use(errorHandler);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('returns the exact status and message for a thrown ApiError, unsanitized', async () => {
    const res = await request(app).get('/api-error');
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('A document is already linked');
  });

  it('sanitizes the client-facing message for a raw (non-ApiError) 500, but logs the real one centrally', async () => {
    const res = await request(app).get('/unexpected-error');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('An unexpected error occurred');

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    const [, logPayload] = consoleErrorSpy.mock.calls[0];
    expect(logPayload.statusCode).toBe(500);
    expect(logPayload.message).toBe('db connection reset');
    expect(logPayload.path).toBe('/unexpected-error');
  });

  it('preserves a 502 ApiError message while still logging the underlying cause centrally', async () => {
    const res = await request(app).get('/wrapped-ai-error');
    expect(res.status).toBe(502);
    expect(res.body.error).toBe('Failed to generate company research');

    const [, logPayload] = consoleErrorSpy.mock.calls[0];
    expect(logPayload.cause).toBe('provider 503');
  });

  it('does not log for expected 4xx ApiErrors (only server-side failures are logged)', async () => {
    await request(app).get('/api-error');
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('asyncHandler forwards a rejected promise to the centralized handler', async () => {
    const res = await request(app).get('/async-thrown');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('An unexpected error occurred');
  });
});
