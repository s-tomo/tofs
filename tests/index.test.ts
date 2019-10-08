import { File, Folder, AnyFile } from "../src";
import { promises as fs } from "fs";
import { join } from "path";
import { execSync } from "child_process";

const WORKDIR = "./.tmp";

beforeAll(async () => {
  await fs.mkdir(WORKDIR);
});

afterAll(async () => {
  execSync(`rm -rf ${WORKDIR}`);
});

describe("any type", () => {
  class Test extends AnyFile {
    async verify(): Promise<boolean> {
      return true;
    }
  }

  test("type guard", () => {
    class Other extends AnyFile {
      async verify(): Promise<boolean> {
        return true;
      }
    }

    const f = new Test(".");
    expect(f.is(Test)).toBeTruthy();
    expect(f.is(Other)).toBeFalsy();
  });

  test("trim trailling backslash from path", () => {
    expect(new Test("/").path).toBe("/");
    expect(new Test("/foo/bar").path).toBe("/foo/bar");
    expect(new Test("/foo/bar/").path).toBe("/foo/bar");
  });

  test("name property", () => {
    expect(new Test("/foo/bar").name).toBe("bar");
  });

  test("parent path property", () => {
    expect(new Test("/foo/bar").parentPath).toBe("/foo");
  });

  test("parent", () => {
    const parent = new Test("/foo/bar").parent();
    expect(parent.path).toBe("/foo");
    expect(parent instanceof Folder).toBeTruthy();
  });

  test("rename", async () => {
    const oldPath = join(WORKDIR, "rename-old");
    const newPath = join(WORKDIR, "rename-new");
    await fs.writeFile(oldPath, "");
    const file = new Test(oldPath);
    await file.rename(newPath);
    expect(file.name).toBe("rename-new");
    await expect(fs.access(oldPath)).rejects.toThrow();
    await expect(fs.access(newPath)).resolves.toBeUndefined();
  });

  test("remove", async () => {
    const path = join(WORKDIR, "remove-test");
    await fs.writeFile(path, "");
    const file = new Test(path);
    await file.remove();
    await expect(fs.access(path)).rejects.toThrow();
  });
});

describe("file type", () => {
  const FILEPATH = join(WORKDIR, "hoge.tar.gz");
  const file = new File(FILEPATH);

  test("suffix property", () => {
    expect(file.suffix).toBe("gz");
  });

  test("suffixes property", () => {
    expect(file.suffixes).toMatchObject(["tar", "gz"]);
  });

  test("open", async () => {
    await expect(fs.access(FILEPATH)).rejects.toThrow();

    const fd = await file.open("w");
    await fd.write("test");

    await expect(
      fs.readFile(FILEPATH).then(buf => {
        return buf.toString();
      }),
    ).resolves.toBe("test");
  });
});

describe("folder type", () => {
  const FOLDERPATH = join(WORKDIR, "foo");
  const FILEPATH = join(FOLDERPATH, "bar");

  test("make and remove", async () => {
    await expect(fs.access(FOLDERPATH)).rejects.toThrow();

    const folder = await Folder.make(FOLDERPATH);

    await expect(fs.access(FOLDERPATH)).resolves.toBeUndefined();

    await fs.writeFile(FILEPATH, "");
    const children = await folder.children();
    const [child] = children;
    expect(children.length).toBe(1);
    expect(child.name).toBe("bar");
    expect(child instanceof File).toBeTruthy();

    await folder.remove();

    await expect(fs.access(FOLDERPATH)).rejects.toThrow();
  });
});
