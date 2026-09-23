import express, { NextFunction, Request, Response } from 'express';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import * as Controllers from 'controllers';
import { NotFound } from 'ts-httpexceptions';
import compression from 'compression';
import { __PROD__, credentials, httpPort, httpsPort } from 'config/environments';
import http from 'http';
import https from 'https';
import { Hierarchy } from 'models';
import * as Tracers from 'tracers';
import { errorHandlerMiddleware, frontendMiddleware, redirectMiddleware } from 'middlewares';

export default class Server {
  readonly hierarchy = new Hierarchy();
  readonly tracers = Object.values(Tracers).map(Tracer => new Tracer());
  private readonly app = express();

  constructor() {
    this.app
      .use(compression())
      .use(morgan(__PROD__ ? 'tiny' : 'dev'))
      .use(redirectMiddleware())
      .use(bodyParser.json())
      .use(bodyParser.urlencoded({ extended: true }))
      .use('/api', this.getApiRouter())
      .use(frontendMiddleware(this));
    this.app.use(errorHandlerMiddleware());
  }

  getApiRouter() {
    const router = express.Router();
    Object.values(Controllers).forEach(Controller => new Controller(this).route(router));
    router.use((req: Request, res: Response, next: NextFunction) => {
      next(new NotFound('API not found.'));
    });
    return router;
  };

  start() {
    const httpServer = http.createServer(this.app);
    httpServer.listen(httpPort);
    console.info(`SYNAPSE-LAB algo-server: listening on port ${httpPort}`);

    if (credentials) {
      const httpsServer = https.createServer(credentials, this.app);
      httpsServer.listen(httpsPort);
      console.info(`https: listening on port ${httpsPort}`);
    }
  }
}

