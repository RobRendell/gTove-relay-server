import express from 'express';
import http from 'http';
import errorHandler from 'errorhandler';
import bodyParser from 'body-parser';
import cors from 'cors';

import BaseEndpointHandler, {Method} from './endpoint/baseEndpoint';
import LinkGetEndpoint from './endpoint/linkGetEndpoint';
import LinkPostEndpoint from './endpoint/linkPostEndpoint';
import McastService from './service/mcastService';
import McastGetEndpoint, {sequenceIdHeader} from './endpoint/mcastGetEndpoint';
import McastPostEndpoint from './endpoint/mcastPostEndpoint';

export default class Server {

    private readonly httpPort: number;
    private app: express.Application;
    private httpServer: http.Server;

    constructor(port = '3001') {
        const portNumber = Number(port);
        if (isNaN(portNumber)) {
            throw new Error(`Port ${port} is not a valid number`);
        }
        this.httpPort = portNumber;
    }

    start() {
        this.configureExpress();
        this.initialiseServices();
        this.httpServer = http.createServer(this.app);
        this.httpServer.listen(this.httpPort);
        this.httpServer.on('error', this.onError.bind(this));
        this.httpServer.on('listening', this.onListening.bind(this));
    }

    /**
     * Event listener for HTTP server 'error' event.
     */
    onError(error: NodeJS.ErrnoException) {
        if (error.syscall !== 'listen') {
            throw error;
        }

        // handle specific listen errors with friendly messages
        switch (error.code) {
            case 'EACCES':
                console.error(`Port ${this.httpPort} requires elevated privileges.`);
                process.exit(1);
                break;
            case 'EADDRINUSE':
                console.error(`Port ${this.httpPort} is already in use.`);
                process.exit(1);
                break;
            default:
                throw error;
        }
    }

    onListening() {
        console.log('Listening on Port ' + this.httpPort);
    }

    private configureExpress() {
        this.app = express();
        this.app.set('port', this.httpPort);

        // Catch unhandled promise rejections and log them.
        process.on('unhandledRejection', (err) => {
            console.error('Unhandled promise rejection:', err);
        });

        this.app.use(errorHandler());
        this.app.use(bodyParser.text());
        this.app.use(cors({
            exposedHeaders: [sequenceIdHeader]
        }));

        // Add endpoint handlers
        this.addEndpoints();
    }

    private addEndpoints() {
        this.addEndpoint(new LinkGetEndpoint());
        this.addEndpoint(new LinkPostEndpoint());
        this.addEndpoint(new McastGetEndpoint());
        this.addEndpoint(new McastPostEndpoint());
    }

    private addEndpoint(handler: BaseEndpointHandler) {
        let callbacks: express.RequestHandler[] = [];
        callbacks.push(handler.handle);
        switch (handler.method) {
            case Method.POST:
                this.app.post(handler.requestPath, callbacks);
                break;
            case Method.GET:
                this.app.get(handler.requestPath, callbacks);
                break;
        }
    }

    initialiseServices() {
        McastService.initialise();
    }
}