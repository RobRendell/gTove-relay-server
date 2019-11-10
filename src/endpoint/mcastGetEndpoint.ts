import express from 'express';

import BaseEndpointHandler from './baseEndpoint';
import {mcastRequestPath} from './navigation';
import McastService from '../service/mcastService';

export const sequenceIdHeader = 'x-relay-sequenceId';

export default class McastGetEndpoint extends BaseEndpointHandler {

    requestPath = mcastRequestPath;

    async handle(request: express.Request, response: express.Response) {
        const mcastId = request.params.mcastId;
        const requestSequenceId = request.query.sequenceId ? Number(request.query.sequenceId) : undefined;
        const {payload, sequenceId} = await McastService.getFromMcastChannel(mcastId, requestSequenceId);
        response.header(sequenceIdHeader, sequenceId.toString()).send(payload);
    }

}