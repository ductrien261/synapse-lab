import express from 'express';
import { Controller } from 'controllers/Controller';
import { resolveSimulation, SimulationError } from 'simulation/service';
import { NotFound } from 'ts-httpexceptions';
import Server from 'Server';

export class AlgorithmsController extends Controller {
  constructor(server: Server) {
    super(server);
    this.router
      .get('/', this.getHierarchy)
      .get('/:categoryKey/:algorithmKey/visualization', this.getVisualization)
      .get('/:categoryKey/:algorithmKey', this.getAlgorithm)
      .get('/sitemap.txt', this.getSitemap);
  }

  route = (router: express.Router): void => {
    router.use('/algorithms', this.router);
  };

  getHierarchy = (req: express.Request, res: express.Response) => {
    this.server.hierarchy.refresh();
    res.json(this.server.hierarchy);
  };

  getAlgorithm = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const {categoryKey, algorithmKey} = req.params;
    const algorithm = this.server.hierarchy.find(categoryKey, algorithmKey);
    if (!algorithm) return next(new NotFound('Algorithm not found.'));
    const engine = resolveSimulation(`${categoryKey}/${algorithmKey}`, algorithm.algorithmName, algorithm.files);
    res.json({algorithm: {...algorithm, visualization: engine && engine.config}});
  };

  getVisualization = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const algorithm = this.server.hierarchy.find(req.params.categoryKey, req.params.algorithmKey);
    if (!algorithm) { res.status(404).json({message: 'Algorithm not found.'}); return; }
    const engine = resolveSimulation(`${req.params.categoryKey}/${req.params.algorithmKey}`, algorithm.algorithmName, algorithm.files);
    if (!engine) { res.status(404).json({message: 'Visualization is not available.'}); return; }
    engine.generate(req.query.sample, req.query.adjacency).then(trace => res.json(trace)).catch(error => {
      if (error instanceof SimulationError) res.status(error.status).json({message: error.message});
      else next(error);
    });
  };

  getSitemap = (req: express.Request, res: express.Response) => {
    const baseUrl = process.env.SYNAPSE_LAB_URL || 'http://localhost:3100';
    const urls: string[] = [];
    this.server.hierarchy.iterate((category, algorithm) => {
      urls.push(`${baseUrl}/algorithms/${category.key}/${algorithm.key}`);
    });
    res.set('Content-Type', 'text/plain');
    res.send(urls.join('\n'));
  };
}
