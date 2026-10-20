extends SceneTree
func _initialize() -> void:
    var args = OS.get_cmdline_user_args()
    if args.size() != 2:
        push_error("Usage: Godot --headless --script export_art.gd -- <game-project-directory> <output-directory>")
        quit(1)
        return
    var base = args[0].trim_suffix("/") + "/"
    var output = args[1].trim_suffix("/") + "/"
    var catalog = JSON.parse_string(FileAccess.get_file_as_string(base + "data/ink_asset_regions.json"))
    for actor in ["prince", "princess", "jester", "intriguer"]:
        var entry = catalog[actor + "|idle"]
        var source = Image.load_from_file(base + entry.path)
        var r = entry.region
        var piece = source.get_region(Rect2i(r[0], r[1], r[2], r[3]))
        piece.save_png(output + actor + ".png")
    quit()
