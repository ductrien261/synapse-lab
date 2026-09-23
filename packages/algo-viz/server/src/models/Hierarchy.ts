import path from 'path';
import { listDirectories } from 'utils/hierarchy';
import { Algorithm, Category, File } from 'models';
import { algorithmsDir } from 'config/paths';

export class Hierarchy {
  private categories!: Category[];
  readonly path: string = algorithmsDir;

  constructor() {
    this.refresh();
  }

  refresh() {
    this.categories = listDirectories(this.path)
      .map(categoryName => new Category(path.resolve(this.path, categoryName), categoryName));
  }

  find(categoryKey: string, algorithmKey: string) {
    const category = this.categories.find(category => category.key === categoryKey);
    if (!category) return;
    const algorithm = category.algorithms.find(algorithm => algorithm.key === algorithmKey);
    if (!algorithm) return;

    const categoryName = category.name;
    const algorithmName = algorithm.name;
    const files = algorithm.files;
    const description = algorithm.description;

    return {categoryKey, categoryName, algorithmKey, algorithmName, files, description};
  }

  iterate(callback: (category: Category, algorithm: Algorithm) => void) {
    this.categories.forEach(category => category.algorithms.forEach(algorithm => callback(category, algorithm)));
  }

  toJSON() {
    const {categories} = this;
    return {categories};
  }
}

