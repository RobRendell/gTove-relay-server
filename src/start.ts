import Server from './server';

const server = new Server(process.env.PORT);
server.start();