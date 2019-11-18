# tofs

[![CircleCI](https://circleci.com/gh/s-tomo/tofs.svg?style=svg&circle-token=ba5f079683e0fd8cf24714bc53d99b3dff641016)](https://circleci.com/gh/s-tomo/tofs)

class-based wrapper for fs module.

## File Types

The following file types are implemented,

- Folder
- File
- Unknown

### Any

```ts
const file = new File("/foo/bar/hoge.jpg");

// Type Guard
file.is(File);

file.path; // "/foo/bar/hoge.jpg"

file.name; // "hoge.jpg"

file.parentPath; // "/foo/bar"

const stat: fs.Stats = await file.stats();

await file.exists(); // true or false

const folder = file.parent();

await folder.rename("/foo/buz");

folder.name; // "buz"

await folder.remove();
```

### File

```ts
const file = new File("./hoge.tar.gz");

file.stem; // "hoge.tar"

file.suffix; // "gz"

file.suffixes; // ["tar", "gz"]

const fd: fs.promises.FileHandler = await file.open("r");
```

### Folder

```ts
const folder = await Folder.make("/foo/bar");

for (const child of await folder.children()) {
  if (child.is(File)) {
    const fd = await child.open("r");
    // ...
  } else if (child.is(Folder)) {
    const children = await child.children();
    // ...
  } else {
    console.log(`unknown file type: ${file.path}`);
  }
}
```

### Custom File Type

Create a custom file type class by inheriting `AnyFile`.

```ts
class SymbolicLink exnteds AnyFile {
  verify(): Promise<boolean> {
    return this.stat.then(stat => stat.isSymbolicLink());
  }
}
```

A custom type can be used for cast within `folder.children` as below,

```ts
for(const child of folder.children({ castable: [SymbolicLink]})) {
  if (child.is(SymbolicLink)) {
    // ...
  }
}
```
