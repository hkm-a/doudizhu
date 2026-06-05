class_name RoundFlowSystem
extends System

## v0.1.0 keeps deterministic round behavior in DoudizhuGame so it can be
## tested without a World. This shell anchors the planned gecs system boundary.
func model_class() -> String:
	return "DoudizhuGame"
