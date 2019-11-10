import express from 'express';

export enum Method {
    GET, POST
}

/**
 * This abstract class represents an endpoint on the server.  Implementations should be added to addEndpoints in server.ts.
 */
export default abstract class BaseEndpointHandler {

    /**
     * The HTTP method used to access this endpoint.  Defaults to GET
     * @type {Method}
     */
    public method: Method = Method.GET;

    /**
     * The URL path this handler will be invoked for.
     */
    public abstract requestPath: string;

    /**
     * Handle the request for this endpoint.
     * @param {express.Request} request
     * @param {express.Response} response
     */
    public abstract handle(request: express.Request, response: express.Response): void;
}