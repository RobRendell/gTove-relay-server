import express from 'express';

import BaseEndpointHandler, {Method} from './baseEndpoint';
import {linkRequestPath} from './navigation';
import LinkService from '../service/linkService';

export default class LinkPostEndpoint extends BaseEndpointHandler {

    method = Method.POST;

    requestPath = linkRequestPath;

    async handle(request: express.Request, response: express.Response): Promise<void> {
        const payload = request.body;
        LinkService.sendToLink(request.params.linkId, payload);
        response.sendStatus(200);
    }
}