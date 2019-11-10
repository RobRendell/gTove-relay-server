import chai from 'chai';
import sinon from 'sinon';

import {LinkService} from './linkService';

describe('linkService', () => {

    const linkId = 'abc-xyz';
    const sandbox = sinon.createSandbox();

    let linkService: LinkService;

    beforeEach(() => {
        linkService = new LinkService();
    });

    afterEach(() => {
        sandbox.restore();
    });

    it('should handle sendToLink then getFromLink', async () => {
        const payload = 'a message';
        linkService.sendToLink(linkId, payload);
        const received = await linkService.getFromLink(linkId);
        chai.assert.equal(received, payload, 'should have received the payload');
    });

    it('should handle getFromLink then sendToLink', async () => {
        const pendingGet = linkService.getFromLink(linkId);
        const payload = 'waiting for Rossini';
        linkService.sendToLink(linkId, payload);
        const received = await pendingGet;
        chai.assert.equal(received, payload, 'should have received the payload');
    });

    it('should handle multiple sendToLinks then multiple getFromLinks', async () => {
        const payload1 = 'first message';
        const payload2 = 'second message';
        const payload3 = 'third message';
        linkService.sendToLink(linkId, payload1);
        linkService.sendToLink(linkId, payload2);
        linkService.sendToLink(linkId, payload3);
        chai.assert.equal(payload1, await linkService.getFromLink(linkId), 'should have received messages in order');
        chai.assert.equal(payload2, await linkService.getFromLink(linkId), 'should have received messages in order');
        chai.assert.equal(payload3, await linkService.getFromLink(linkId), 'should have received messages in order');
    });

    it('should abort first getFromLink if second getFromLink with same linkId is called', async () => {
        const firstPendingGet = linkService.getFromLink(linkId);
        const secondPendingGet = linkService.getFromLink(linkId);
        const payload = 'waiting for Rossini';
        linkService.sendToLink(linkId, payload);
        chai.assert.equal(await firstPendingGet, '', 'should have received empty result');
        chai.assert.equal(await secondPendingGet, payload, 'should have received the payload');
    });

    it('should handle working with different linkIds', async () => {
        const linkId2 = 'a different channel';
        const payload1 = 'first message';
        const payload2 = 'second message';
        const payload3 = 'third message';
        linkService.sendToLink(linkId2, payload1);
        linkService.sendToLink(linkId, payload2);
        linkService.sendToLink(linkId2, payload3);
        chai.assert.equal(payload1, await linkService.getFromLink(linkId2), 'should have received messages in order');
        chai.assert.equal(payload3, await linkService.getFromLink(linkId2), 'should have received messages in order');
        chai.assert.equal(payload2, await linkService.getFromLink(linkId), 'should have received messages in order');
    });

    it('should expire messages which are too old', async () => {
        const nowStub = sandbox.stub(Date, 'now');
        nowStub.onCall(0).returns(1000);
        nowStub.returns(1001 + 60*60*1000);
        const expireMessage = 'first message that will expire';
        const surviveMessage = 'second message that will not';
        linkService.sendToLink(linkId, expireMessage);
        linkService.sendToLink(linkId, surviveMessage);
        linkService.expireMessages();
        const afterExpire = await linkService.getFromLink(linkId);
        chai.assert.equal(afterExpire, surviveMessage, 'should get second message, first message should have expired');
    });

    it('should remove channel if all messages expire and no requests pending', async () => {
        const nowStub = sandbox.stub(Date, 'now');
        nowStub.onCall(0).returns(1000);
        nowStub.onCall(1).returns(1000);
        nowStub.onCall(2).returns(1000);
        nowStub.returns(1001 + 60*60*1000);
        linkService.sendToLink(linkId, 'first message - will expire');
        linkService.sendToLink(linkId, 'second message - will expire');
        linkService.sendToLink(linkId, 'third message - will expire');
        linkService.expireMessages();
        chai.assert.isFalse(linkService.doesChannelExist(linkId), 'channel should be gone');
    });

    it('should not remove channel if no messages but requests pending', async () => {
        // Make request but don't await the result
        linkService.getFromLink(linkId);
        // There are no messages in the channel, since none have been sent, so all messages have effectively expired.
        linkService.expireMessages();
        chai.assert.isTrue(linkService.doesChannelExist(linkId), 'channel should survive');
    });

});