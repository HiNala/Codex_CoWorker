# FORGE changelog

The mission pack uses one append-only file per track so parallel work can coordinate without a shared
write hotspot. This local ignition does not use Git, but the same interface and blocker records are
kept available for later implementation work.
