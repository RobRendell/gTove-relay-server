import chai from 'chai';
import sinon from 'sinon';

import {McastService} from './mcastService';

describe('mcastService', () => {

    const mcastId = 'a multicast channel';
    const sandbox = sinon.createSandbox();

    let mcastService: McastService;

    beforeEach(() => {
        mcastService = new McastService();
    });

    afterEach(() => {
        sandbox.restore();
    });

    it('should handle sendToMcastChannel followed by multiple getFromMcastChannels for first sequenceId', async() => {
        const message = 'a message to be sent';
        mcastService.sendToMcastChannel(mcastId, message);
        const response1 = await mcastService.getFromMcastChannel(mcastId, 1);
        chai.assert.equal(response1.payload, message, 'should have sent message');
        chai.assert.equal(response1.sequenceId, 2, 'should have returned next sequenceId');
        const response2 = await mcastService.getFromMcastChannel(mcastId, 1);
        chai.assert.equal(response2.payload, message, 'should have sent message');
        chai.assert.equal(response2.sequenceId, 2, 'should have returned next sequenceId');
    });

    it('getFromMcastChannel should get the next message sent when sequenceId undefined', async () => {
        mcastService.sendToMcastChannel(mcastId, 'message that should not be received');
        const pendingGet = mcastService.getFromMcastChannel(mcastId);
        const payload = 'expected message';
        mcastService.sendToMcastChannel(mcastId, payload);
        const received = await pendingGet;
        chai.assert.equal(received.payload, payload, 'should have received first message sent AFTER the get');
        chai.assert.equal(received.sequenceId, 3, 'should send next sequence ID');
    });

    it('should expire messages which are too old', async () => {
        const nowStub = sandbox.stub(Date, 'now');
        nowStub.onCall(0).returns(1000);
        nowStub.returns(1001 + 60*60*1000);
        const expireMessage = 'message that will expire';
        const surviveMessage = 'message that will not';
        mcastService.sendToMcastChannel(mcastId, expireMessage);
        mcastService.sendToMcastChannel(mcastId, surviveMessage);
        const beforeExpire = await mcastService.getFromMcastChannel(mcastId, 1);
        chai.assert.equal(beforeExpire.payload, expireMessage, 'should get first message');
        mcastService.expireMessages();
        const afterExpire = await mcastService.getFromMcastChannel(mcastId, 1);
        chai.assert.equal(afterExpire.payload, surviveMessage, 'should get second message, first message should have expired');
    });

    it('should handle getting expired messages when sequenceId has wrapped', async () => {
        // It will take some contriving to arrange this test without opening up access to the private "channels" field.
        const nowStub = sandbox.stub(Date, 'now');
        nowStub.onCall(0).returns(1000);
        nowStub.onCall(1).returns(1000);
        nowStub.returns(1001 + 60*60*1000);
        // Make mcastServer wrap after seqId 3 rather than Number.MAX_SAFE_INTEGER
        sandbox.stub(mcastService, 'getNextSequenceId').callsFake((seqId) => (seqId >= 3 ? 1 : seqId + 1));
        mcastService.sendToMcastChannel(mcastId, 'first message - will expire');
        mcastService.sendToMcastChannel(mcastId, 'second message - will expire');
        const payload3 = 'third message - will not expire';
        mcastService.sendToMcastChannel(mcastId, payload3);
        mcastService.expireMessages();
        // At this point, the seqId should have wrapped back to 1, but there should be a message at seqId 3
        const getResponse3 = await mcastService.getFromMcastChannel(mcastId, 3);
        chai.assert.equal(getResponse3.payload, payload3, 'should have received third message');
        chai.assert.equal(getResponse3.sequenceId, 1, 'should have received wrapped sequenceId');
        const getResponse2 = await mcastService.getFromMcastChannel(mcastId, 2);
        chai.assert.equal(getResponse2.payload, payload3, 'should have also received third message');
        chai.assert.equal(getResponse2.sequenceId, 1, 'should have also received wrapped sequenceId');
    });

    it('should remove channel if all messages expire and no requests pending', async () => {
        const nowStub = sandbox.stub(Date, 'now');
        nowStub.onCall(0).returns(1000);
        nowStub.onCall(1).returns(1000);
        nowStub.onCall(2).returns(1000);
        nowStub.returns(1001 + 60*60*1000);
        mcastService.sendToMcastChannel(mcastId, 'first message - will expire');
        mcastService.sendToMcastChannel(mcastId, 'second message - will expire');
        mcastService.sendToMcastChannel(mcastId, 'third message - will expire');
        mcastService.expireMessages();
        chai.assert.isFalse(mcastService.doesChannelExist(mcastId), 'channel should be gone');
    });

    it('should not remove channel if all messages expired but requests pending', async () => {
        // Make request but don't await the result
        mcastService.getFromMcastChannel(mcastId);
        // There are no messages in the channel, since none have been sent, so all messages have expired in a sense.
        mcastService.expireMessages();
        chai.assert.isTrue(mcastService.doesChannelExist(mcastId), 'channel should survive');
    });

});