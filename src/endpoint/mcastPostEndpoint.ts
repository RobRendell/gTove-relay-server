import express from 'express';

import BaseEndpointHandler, {Method} from './baseEndpoint';
import {mcastRequestPath} from './navigation';
import McastService from '../service/mcastService';

export default class McastPostEndpoint extends BaseEndpointHandler {

    method = Method.POST;

    requestPath = mcastRequestPath;

    async handle(request: express.Request, response: express.Response): Promise<void> {
        const payload = request.body;
        const mcastId = request.params.mcastId;
        McastService.sendToMcastChannel(mcastId, payload);
        response.sendStatus(200);
    }
}