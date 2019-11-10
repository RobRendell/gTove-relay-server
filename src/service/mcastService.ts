import singleton from './singleton';

export interface McastGetResponse {
    payload: string;
    sequenceId: number;
}

type Pending = (payload: McastGetResponse) => void;

interface Channel {
    sequenceId: number;
    oldestSequenceId: number;
    messages: {[seqId: number]: {
            payload: string;
            timestamp: number;
        }};
    pending: Pending[];
}

export class McastService {

    private channels: {[mcastId: string]: Channel} = {};

    private expireMessagesInterval?: NodeJS.Timer;

    initialise() {
        this.expireMessagesInterval = setInterval(this.expireMessages.bind(this), 60*1000);
    }

    shutdown() {
        if (this.expireMessagesInterval) {
            clearInterval(this.expireMessagesInterval);
            this.expireMessagesInterval = undefined;
        }
    }

    expireMessages() {
        // Expire messages more than an hour old.
        const timeout = Date.now() - 60 * 60 * 1000;
        for (let mcastId of Object.keys(this.channels)) {
            const channel = this.channels[mcastId];
            while (channel.messages[channel.oldestSequenceId] && channel.messages[channel.oldestSequenceId].timestamp < timeout) {
                delete(channel.messages[channel.oldestSequenceId]);
                channel.oldestSequenceId = this.getNextSequenceId(channel.oldestSequenceId);
            }
            if (!channel.messages[channel.oldestSequenceId] && channel.pending.length === 0) {
                // If all messages have expired and no-one is pending, also clean up the channel.
                delete(this.channels[mcastId]);
            }
        }
    }

    private getChannel(mcastId: string): Channel {
        let channel = this.channels[mcastId];
        if (!channel) {
            channel = {
                sequenceId: 1,
                oldestSequenceId: 1,
                messages: {},
                pending: []
            };
            this.channels[mcastId] = channel;
        }
        return channel;
    }

    getNextSequenceId(sequenceId: number): number {
        return sequenceId >= Number.MAX_SAFE_INTEGER ? 1 : sequenceId + 1;
    }

    async getFromMcastChannel(mcastId: string, sequenceId?: number): Promise<McastGetResponse> {
        const channel = this.getChannel(mcastId);
        if (sequenceId === undefined) {
            // If the get request doesn't specify a sequenceId, return the next message sent to the channel.
            sequenceId = channel.sequenceId;
        } else {
            // If the get request is for a specific message but it has expired, start at the oldest unexpired message.
            const wrapped = channel.sequenceId < channel.oldestSequenceId;
            if (sequenceId < channel.oldestSequenceId && (!wrapped || sequenceId > channel.sequenceId)) {
                sequenceId = channel.oldestSequenceId;
            }
        }
        if (channel.messages[sequenceId]) {
            return {
                payload: channel.messages[sequenceId].payload,
                sequenceId: this.getNextSequenceId(sequenceId)
            };
        } else {
            return new Promise<McastGetResponse>((resolve) => {
                channel.pending.push(resolve);
            });
        }
    }

    sendToMcastChannel(mcastId: string, payload: string): void {
        const channel = this.getChannel(mcastId);
        channel.messages[channel.sequenceId] = {
            payload,
            timestamp: Date.now()
        };
        channel.sequenceId = this.getNextSequenceId(channel.sequenceId);
        if (channel.pending.length > 0) {
            for (let pending of channel.pending) {
                pending({
                    payload,
                    sequenceId: channel.sequenceId
                })
            }
            channel.pending = [];
        }
    }

    doesChannelExist(mcastId: string) {
        return this.channels[mcastId] !== undefined;
    }

}

export default singleton(McastService);