# Running qufox-docs on Kubernetes

The engine ships as a container image at `ghcr.io/talsu/qufox-docs`. Everything
starts from that image; the only real decision is **live serving vs. static
serving**.

## Which pattern should I use?

| | Pattern A — Live serve | Pattern B — Static + nginx |
| --- | --- | --- |
| Best for | Internal wikis, living docs | Public sites, high traffic |
| Updates | Seconds after a push | Every rebuild (e.g. 5 min) |
| Serving | qufox renders on request | nginx serves prebuilt HTML |
| Scaling | One writer pod | Scale nginx freely |
| Storage | `emptyDir` or any volume | ReadWriteMany PVC |
| Manifest | [`live-serve.yaml`](live-serve.yaml) | [`static-nginx.yaml`](static-nginx.yaml) |

If you just want your notes online and updating quickly, start with **Pattern A**.
If you need a cacheable, horizontally scaled public site, use **Pattern B**.

## Pattern A — Live serve

qufox-docs `serve` watches the content directory and re-renders on change. A
small sidecar keeps a git repository up to date **in place** with `git pull`,
which the `--poll` watcher detects.

```sh
kubectl apply -f live-serve.yaml
```

Edit the manifest: set your repository URL in both the `git-clone` init
container and the `git-pull` sidecar, the `QUFOX_SITE_URL`, and the Ingress
host. Serve production traffic with `--no-live-reload` (already set) so readers
are not refreshed mid-page.

> **Important:** do not use [kubernetes/git-sync](https://github.com/kubernetes/git-sync)
> as the content source for live serving. git-sync updates by atomically
> swapping a symlink to a brand-new checkout directory, and a file watcher
> (including `--poll`) does not follow that swap — the site would keep serving
> the old revision. Use an in-place `git pull` (as in the manifest) instead.
> git-sync is the right tool for Pattern B, where nothing is watched.

For non-git content (an Obsidian sync target, an rsync job, `kubectl cp`),
remove the git containers and mount your own volume at `/content`.

## Pattern B — Static site served by nginx

A `CronJob` renders the site into a shared volume; nginx serves it. Here
git-sync is a good fit, because `build` reads the checkout once per run.

```sh
kubectl apply -f static-nginx.yaml
```

Edit the manifest: set the repository URL, `QUFOX_SITE_URL`, the rebuild
`schedule`, and the PVC `storageClassName`. This pattern needs a
**ReadWriteMany** PVC so the CronJob can write while nginx reads. The bundled
nginx config resolves qufox's extensionless URLs to their `index.html` and
serves `404.html`.

No RWX storage? Either use Pattern A, or run `qufox-docs build` in CI and bake
the output into your own nginx image.

## The image directly

```sh
# Serve a mounted folder
docker run -p 4880:4880 -v "$PWD/notes:/content:ro" \
  ghcr.io/talsu/qufox-docs:latest serve /content --poll --no-live-reload

# Build a static site (the output mount must be writable by uid 1000)
docker run --rm -v "$PWD/notes:/content:ro" -v "$PWD/dist:/out" \
  ghcr.io/talsu/qufox-docs:latest build /content --out /out
```

The image runs as a non-root user (uid 1000); set `securityContext.fsGroup: 1000`
so mounted volumes are writable (already set in both manifests). Content
mounted from a host on macOS/Windows or across some CSI drivers may not deliver
inotify events, which is why `--poll` is used throughout.
