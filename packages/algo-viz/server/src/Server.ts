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
  // Legacy /api/tracers endpoints need Docker/AWS inside this process. The
  // catalog simulation API uses simulation/service instead and does not need them.
  readonly tracers = process.env.LEGACY_TRACERS_ENABLED === '1'
    ? Object.values(Tracers).map(Tracer => new Tracer())
    : [];
  private readonly app = express();

  constructor() {
    this.app
      .use((req: Request, res: Response, next: NextFunction) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        if (req.method === 'OPTIONS') {
          res.sendStatus(200);
          return;
        }
        next();
      })
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
