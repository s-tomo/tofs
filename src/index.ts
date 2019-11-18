import { promises as fs, Stats, MakeDirectoryOptions } from "fs";
import { basename, dirname, join, resolve } from "path";

export abstract class AnyFile {
  private _path: string;

  constructor(path: string) {
    this._path = this.trim(resolve(path));
  }

  /**
   * Type Guard
   */
  is<T extends AnyFile>(type: FileType<T>): this is T {
    return this instanceof type;
  }

  /**
   * returns whether the path matches this file type.
   */
  abstract verify(): Promise<boolean>;

  /**
   * returns absolute path
   */
  get path(): string {
    return this._path;
  }

  protected trim(path: string): string {
    return path.replace(/(.+)\/$/, "$1");
  }

  /**
   * returns basename
   */
  get name(): string {
    return basename(this.path);
  }

  /**
   * returns parent dir absolute path
   */
  get parentPath(): string {
    return dirname(this.path);
  }

  /**
   * returns status object
   */
  stat(): Promise<Stats> {
    return fs.stat(this.path);
  }

  /**
   * checks existence
   */
  async exists(): Promise<boolean> {
    try {
      await fs.access(this.path);
      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * returns parent folder
   */
  parent(): Folder {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    return new Folder(this.parentPath);
  }

  async rename(newPath: string): Promise<void> {
    newPath = this.trim(newPath);
    await fs.rename(this.path, newPath);
    this._path = newPath;
  }

  remove(): Promise<void> {
    return fs.unlink(this.path);
  }
}

export type FileType<T extends AnyFile = AnyFile> = { new (path: string): T };

/**
 * This is expected to return when unimplemented file type
 */
export class Unknown extends AnyFile {
  async verify(): Promise<boolean> {
    return true;
  }
}

export class File extends AnyFile {
  verify(): Promise<boolean> {
    return this.stat().then(stat => stat.isFile());
  }

  open(flags: string | number, mode?: string | number): Promise<fs.FileHandle> {
    return fs.open(this.path, flags, mode);
  }

  get stem(): string {
    const i = this.name.lastIndexOf(".");
    return i < 0 ? this.name : this.name.substring(0, i);
  }

  get suffix(): string {
    const i = this.name.lastIndexOf(".");
    return i < 0 ? "" : this.name.substring(i + 1);
  }

  get suffixes(): string[] {
    return this.name.split(".").slice(1);
  }
}

export class Folder extends AnyFile {
  verify(): Promise<boolean> {
    return this.stat().then(stat => stat.isDirectory());
  }

  async children(opts: { castable?: FileType[] } = {}): Promise<AnyFile[]> {
    const children = await fs.readdir(this.path);
    const types = [...(opts.castable || []), Folder, File, Unknown];
    return Promise.all(
      children
        .map(name => join(this.path, name))
        .map(async path => {
          try {
            await fs.access(path);
          } catch (err) {
            throw err as Error;
          }
          for (const type of types) {
            const file = new type(path);
            if (await file.verify()) {
              return file;
            }
          }
          throw new Error(`invalid file type: ${path}`);
        }),
    );
  }

  async remove(): Promise<void> {
    await Promise.all((await this.children()).map(child => child.remove()));
    await fs.rmdir(this.path);
  }

  static async make(
    path: string,
    opts?: MakeDirectoryOptions,
  ): Promise<Folder> {
    await fs.mkdir(path, opts);
    return new Folder(path);
  }
}
