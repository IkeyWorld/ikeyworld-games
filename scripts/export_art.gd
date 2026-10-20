extends SceneTree
func _initialize() -> void:
    var base = "C:/Users/QQTGM/OneDrive/Documents/ChatGPT/Happy End Continuie/storybook_v081/Teatr_Zabytyh_Sudeb_Godot4/"
    var output = "C:/Users/QQTGM/OneDrive/Documents/ChatGPT/Happy End Continuie/games-site/dist/assets/"
    var catalog = JSON.parse_string(FileAccess.get_file_as_string(base + "data/ink_asset_regions.json"))
    for actor in ["prince", "princess", "jester", "intriguer"]:
        var entry = catalog[actor + "|idle"]
        var source = Image.load_from_file(base + entry.path)
        var r = entry.region
        var piece = source.get_region(Rect2i(r[0], r[1], r[2], r[3]))
        piece.save_png(output + actor + ".png")
    quit()
