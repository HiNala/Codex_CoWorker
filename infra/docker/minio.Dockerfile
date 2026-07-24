# forge/minio — pinned MinIO digest for local + Railway object storage.
# Credentials: MINIO_ROOT_USER / MINIO_ROOT_PASSWORD via runtime env only.
# Never hard-code access keys or bake secrets into this layer.
# Liveness (compose/Railway): GET http://127.0.0.1:9000/minio/health/live
# Keep the admin console (:9001) bound to localhost or private network only.

FROM minio/minio@sha256:14cea493d9a34af32f524e538b8346cf79f3321eff8e708c1e2960462bd8936e
