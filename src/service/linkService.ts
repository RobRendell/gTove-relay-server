import singleton from './singleton';

interface Channel {
    messages: {
            payload: string;
            timestamp: number;
        }[];
    pending?: (payload: string) => void;
}

export class LinkService {

    private channels: {[linkId: string]: Channel} = {};

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
        for (let linkId of Object.keys(this.channels)) {
            const channel = this.channels[linkId];
            while (channel.messages.length > 0 && channel.messages[0].timestamp < timeout) {
                channel.messages.shift();
            }
            if (channel.messages.length === 0 && !channel.pending) {
                // If all messages have expired and no-one is pending, also clean up the channel.
                delete(this.channels[linkId]);
            }
        }
    }

    private getChannel(mcastId: string): Channel {
        let channel = this.channels[mcastId];
        if (!channel) {
            channel = {
                messages: []
            };
            this.channels[mcastId] = channel;
        }
        return channel;
    }

    async getFromLink(linkId: string): Promise<string> {
        const channel = this.getChannel(linkId);
        const message = channel.messages.shift();
        if (message) {
            return message.payload;
        } else {
            if (channel.pending) {
                // Can't have more than one pending get, so resolve it with an empty string
                channel.pending('');
            }
            return await new Promise<string>((resolve) => {
                channel.pending = resolve;
            });
        }
    }

    sendToLink(linkId: string, payload: string): void {
        const channel = this.getChannel(linkId);
        if (channel.pending) {
            channel.pending(payload);
            channel.pending = undefined;
        } else {
            channel.messages.push({
                payload,
                timestamp: Date.now()
            });
        }
    }

    doesChannelExist(linkId: string) {
        return this.channels[linkId] !== undefined;
    }

}

export default singleton(LinkService);