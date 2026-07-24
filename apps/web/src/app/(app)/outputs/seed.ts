/**
 * Re-export library seed so the Outputs UI shares the same two historical
 * artifacts as /api/artifacts. Single source lives under api/artifacts/seed.
 */
export {
  getSeedArtifact,
  listSeedArtifactItems,
  SEED_ARTIFACTS,
  type ArtifactListItem,
  type SeedArtifactDetail,
} from "../../api/artifacts/seed";
