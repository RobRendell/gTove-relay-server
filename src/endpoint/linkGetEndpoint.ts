import express from 'express';

import BaseEndpointHandler from './baseEndpoint';
import {linkRequestPath} from './navigation';
import LinkService from '../service/linkService';

export default class LinkGetEndpoint extends BaseEndpointHandler {

    requestPath = linkRequestPath;

    async handle(request: express.Request, response: express.Response): Promise<void> {
        const linkId = request.params.linkId;
        const payload = await LinkService.getFromLink(linkId);
        response.send(payload);
    }

}