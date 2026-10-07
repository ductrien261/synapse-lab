// Unweighted BFS: each vertex enters the queue once. Start defaults to vertex 0.
export interface BfsEvent {
  key: string;
  current: number | null;
  candidate: number | null;
  queue: number[];
  order: number[];
  distances: number[];
  parents: number[];
}
export function breadthFirstSearch(adjacency: number[][], start = 0, onStep: (event: BfsEvent) => void = () => undefined) {
  const distances = adjacency.map(() => -1);
  const parents = adjacency.map(() => -1);
  const queue: number[] = [];
  const order: number[] = [];
  const emit = (key: string, current: number | null, candidate: number | null = null) => onStep({ key, current, candidate, queue: [...queue], order: [...order], distances: [...distances], parents: [...parents] });
  distances[start] = 0; // @start
  queue.push(start);
  emit('start', start);
  while (queue.length) { // @loop
    const current = queue.shift()!; // @dequeue
    order.push(current);
    emit('dequeue', current);
    for (let next = 0; next < adjacency.length; next++) { // @scan
      if (!adjacency[current][next]) continue;
      emit('scan', current, next);
      if (distances[next] !== -1) { // @skip
        emit('skip', current, next);
        continue;
      }
      distances[next] = distances[current] + 1; // @discover
      parents[next] = current;
      queue.push(next);
      emit('discover', current, next);
    }
  }
  emit('done', null); // @done
  return { order, distances, parents };
}
