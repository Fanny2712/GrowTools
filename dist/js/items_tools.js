var items_secret_key = "PBG892FXX982ABC*"
var data_json = {}
var encoded_buffer_file = [];

const byteToHex = [];

for (let n = 0; n <= 0xff; ++n) {
    const hexOctet = n.toString(16).padStart(2, "0");
    byteToHex.push(hexOctet);
}
const a = document.createElement("a");
var saveData = (function () {
    a.style = "display: none";
    /**
     * @param {ArrayBuffer} data
     * @param {string} fileName
     */
    return function (data, fileName) {
        blob = new Blob([data], { type: "octet/stream" }),
            url = window.URL.createObjectURL(blob);
        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);
    };
}());

var saveDataBuffer = (function () {
    a.style = "display: none";
    /**
     * @param {ArrayBuffer} data
     * @param {string} fileName
     */
    return function (data, fileName) {
        blob = new Blob([new Uint8Array(data)], { type: "octet/stream" }),
            url = window.URL.createObjectURL(blob);
        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);
    };
}());

/**
 * @param {ArrayBuffer} arrayBuffer
 * @return {string}
 */
function hex(arrayBuffer, is_without_space) {
    const buff = new Uint8Array(arrayBuffer);
    const hexOctets = [];
    for (let i = 0; i < buff.length; ++i) hexOctets.push(byteToHex[buff[i]]);

    return hexOctets.join(is_without_space ? "" : " ");
}

/**
 * @param {ArrayBuffer} buffer
 * @param {number} pos
 * @param {number} len
 * @return {string}
 */
function read_buffer_number(buffer, pos, len) {
    let value = 0;
    for (let a = 0; a < len; a++) value += buffer[pos + a] << (a * 8)

    return value;
}

/**
 * @param {number} pos
 * @param {number} len
 * @param {number} value
 */
function write_buffer_number(pos, len, value) {
    for (let a = 0; a < len; a++) {
        encoded_buffer_file[pos + a] = (value >> (a * 8)) & 255;
    }
}

function write_buffer_string(pos, len, value, using_key, item_id) {
    for (let a = 0; a < len; a++) {
        if (using_key) encoded_buffer_file[pos + a] = value.charCodeAt(a) ^ (items_secret_key.charCodeAt((a + item_id) % items_secret_key.length))
        else encoded_buffer_file[pos + a] = value.charCodeAt(a)
    }
}

function hash_buffer(buffer, element, text) {
    var hash = 0x55555555;
    var toBuffer = new Uint8Array(buffer);
    for (let a = 0; a < toBuffer.length; a++) hash = (hash >>> 27) + (hash << 5) + toBuffer[a]
    document.getElementById(element).innerHTML = text + hash
}

/**
 * Convert a hex string to an ArrayBuffer.
 * 
 * @param {string} hexString - hex representation of bytes
 * @return {ArrayBuffer} - The bytes in an ArrayBuffer.
 */
function hexStringToArrayBuffer(pos, hexString) { //https://gist.github.com/don/871170d88cf6b9007f7663fdbc23fe09
    // remove the space
    hexString = hexString.replace(/ /g, '');
    if (hexString.length % 2 != 0) console.log('WARNING: expecting an even number of characters in the hexString');

    // check for some non-hex characters
    var bad = hexString.match(/[G-Z\s]/i);
    if (bad) console.log('WARNING: found non-hex characters', bad);

    // convert the octets to integers
    var integers = hexString.match(/[\dA-F]{2}/gi).map(function (s) {
        encoded_buffer_file[pos++] = parseInt(s, 16)
    });

    return integers
}

/**
 * @param {ArrayBuffer} buffer
 * @param {number} pos
 * @param {number} len
 * @param {boolean} using_key
 * @param {number} item_id
 */
function read_buffer_string(buffer, pos, len, using_key, item_id) {
    var result = "";
    if (using_key) for (let a = 0; a < len; a++) result += String.fromCharCode(buffer[a + pos] ^ items_secret_key.charCodeAt((item_id + a) % items_secret_key.length))
    else for (let a = 0; a < len; a++) result += String.fromCharCode(buffer[a + pos])

    return result;
}

document.getElementById('decode_items_dat').addEventListener('click', function () {
    var input = document.createElement('input');
    input.type = 'file';
    input.style.display = 'none';

    input.onchange = function (e) {
        var file = e.target.files[0];
        item_decoder(file);
    };

    document.body.appendChild(input);
    input.click();
});

document.getElementById('decode_items_dat_editor').addEventListener('click', function () {
    var input = document.createElement('input');
    input.type = 'file';
    input.style.display = 'none';

    input.onchange = function (e) {
        var file = e.target.files[0];
        item_decoder(file, true);
    };

    document.body.appendChild(input);
    input.click();
});

document.getElementById('encode_items_dat').addEventListener('click', function () {
    var input = document.createElement('input');
    input.type = 'file';
    input.style.display = 'none';

    input.onchange = function (e) {
        var file = e.target.files[0];
        item_encoder(file);
    };

    document.body.appendChild(input);
    input.click();
});

function check_last_char(dest, src) {
    return dest[dest.length - 1] == src
}

function item_decoder(file, using_editor) {
    data_json = {}
    let mem_pos = 6;
    var reader = new FileReader()
    reader.readAsArrayBuffer(file);

    reader.onload = function (e) {
        var arrayBuffer = new Uint8Array(e.target.result);
        var version = read_buffer_number(arrayBuffer, 0, 2);
        var item_count = read_buffer_number(arrayBuffer, 2, 4);

        if (version > 19) {
            return Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            }).fire({
                icon: 'error',
                title: "Your items.dat version is " + version + ", and This decoder doesnt support that version!"
            })
        }
        data_json.version = version
        data_json.item_count = item_count
        data_json.items = []

        // Check if this is a proprietary item database
        let isProprietary = false;
        let proprietaryVersion = 0;
        let customItemsCount = 0;
        let originalItemsCount = 0;

        // If needed, you could add proprietary detection logic here
        // Similar to IsProprietaryItemDB() in the C++ code

        for (let a = 0; a < item_count; a++) {
            var item_id = read_buffer_number(arrayBuffer, mem_pos, 4);
            mem_pos += 4;

            var editable_type = arrayBuffer[mem_pos++];
            var item_category = arrayBuffer[mem_pos++];
            var action_type = arrayBuffer[mem_pos++];
            var hit_sound_type = arrayBuffer[mem_pos++];

            var len = read_buffer_number(arrayBuffer, mem_pos, 2)
            mem_pos += 2;
            var name = read_buffer_string(arrayBuffer, mem_pos, len, true, Number(item_id));
            mem_pos += len;

            len = read_buffer_number(arrayBuffer, mem_pos, 2)
            mem_pos += 2;
            var texture = read_buffer_string(arrayBuffer, mem_pos, len);
            mem_pos += len;

            // Remove the .rttex extension
            texture = texture.replace('.rttex', '');

            var texture_hash = read_buffer_number(arrayBuffer, mem_pos, 4);
            mem_pos += 4;

            var item_kind = arrayBuffer[mem_pos++];

            var val1 = read_buffer_number(arrayBuffer, mem_pos, 4);
            mem_pos += 4;

            var texture_x = arrayBuffer[mem_pos++];
            var texture_y = arrayBuffer[mem_pos++];
            var spread_type = arrayBuffer[mem_pos++];
            var is_stripey_wallpaper = arrayBuffer[mem_pos++];
            var collision_type = arrayBuffer[mem_pos++];
            var break_hits = arrayBuffer[mem_pos++];

            if ((break_hits % 6) !== 0) break_hits = break_hits + "r"
            else break_hits = break_hits / 6

            var drop_chance = read_buffer_number(arrayBuffer, mem_pos, 4);
            mem_pos += 4;

            var clothing_type = arrayBuffer[mem_pos++];

            var rarity = read_buffer_number(arrayBuffer, mem_pos, 2);
            mem_pos += 2;

            var max_amount = arrayBuffer[mem_pos++];

            len = read_buffer_number(arrayBuffer, mem_pos, 2)
            mem_pos += 2;
            var extra_file = read_buffer_string(arrayBuffer, mem_pos, len);
            mem_pos += len;

            var extra_file_hash = read_buffer_number(arrayBuffer, mem_pos, 4);
            mem_pos += 4;

            var audio_volume = read_buffer_number(arrayBuffer, mem_pos, 4);
            mem_pos += 4;

            len = read_buffer_number(arrayBuffer, mem_pos, 2)
            mem_pos += 2;
            var pet_name = read_buffer_string(arrayBuffer, mem_pos, len);
            mem_pos += len;

            len = read_buffer_number(arrayBuffer, mem_pos, 2)
            mem_pos += 2;
            var pet_prefix = read_buffer_string(arrayBuffer, mem_pos, len);
            mem_pos += len;

            len = read_buffer_number(arrayBuffer, mem_pos, 2)
            mem_pos += 2;
            var pet_suffix = read_buffer_string(arrayBuffer, mem_pos, len);
            mem_pos += len;

            len = read_buffer_number(arrayBuffer, mem_pos, 2);
            mem_pos += 2;
            var pet_ability = read_buffer_string(arrayBuffer, mem_pos, len);
            mem_pos += len;

            var seed_base = arrayBuffer[mem_pos++];
            var seed_overlay = arrayBuffer[mem_pos++];
            var tree_base = arrayBuffer[mem_pos++];
            var tree_leaves = arrayBuffer[mem_pos++];

            var seed_color_a = arrayBuffer[mem_pos++];
            var seed_color_r = arrayBuffer[mem_pos++];
            var seed_color_g = arrayBuffer[mem_pos++];
            var seed_color_b = arrayBuffer[mem_pos++];
            var seed_overlay_color_a = arrayBuffer[mem_pos++];
            var seed_overlay_color_r = arrayBuffer[mem_pos++];
            var seed_overlay_color_g = arrayBuffer[mem_pos++];
            var seed_overlay_color_b = arrayBuffer[mem_pos++];

            // Read ingredient instead of skipping
            var ingredient = read_buffer_number(arrayBuffer, mem_pos, 4);
            mem_pos += 4;

            var grow_time = read_buffer_number(arrayBuffer, mem_pos, 4);
            mem_pos += 4;

            var val2 = read_buffer_number(arrayBuffer, mem_pos, 2);
            mem_pos += 2;
            var is_rayman = read_buffer_number(arrayBuffer, mem_pos, 2);
            mem_pos += 2;

            len = read_buffer_number(arrayBuffer, mem_pos, 2)
            mem_pos += 2;
            var extra_options = read_buffer_string(arrayBuffer, mem_pos, len);
            mem_pos += len;

            len = read_buffer_number(arrayBuffer, mem_pos, 2)
            mem_pos += 2;
            var texture2 = read_buffer_string(arrayBuffer, mem_pos, len);
            mem_pos += len;

            len = read_buffer_number(arrayBuffer, mem_pos, 2)
            mem_pos += 2;
            var extra_options2 = read_buffer_string(arrayBuffer, mem_pos, len);
            mem_pos += len;

            var data_position_80 = hex(arrayBuffer.slice(mem_pos, mem_pos + 80), document.getElementById("using_txt_mode").checked).toUpperCase()
            var reserved_bytes = arrayBuffer.slice(mem_pos, mem_pos + 80);
            mem_pos += 80;

            var punch_options = "";
            if (version >= 11) {
                len = read_buffer_number(arrayBuffer, mem_pos, 2)
                mem_pos += 2;
                punch_options = read_buffer_string(arrayBuffer, mem_pos, len);
                mem_pos += len;
            }

            var flags3 = 0;
            if (version >= 12) {
                var data_version_12 = hex(arrayBuffer.slice(mem_pos, mem_pos + 13), document.getElementById("using_txt_mode").checked).toUpperCase();
                
                // In C++ this is flags3
                flags3 = read_buffer_number(arrayBuffer, mem_pos, 4);
                mem_pos += 4;

                // In C++ this seems to be bodyPart (9 bytes)
                var body_part = arrayBuffer.slice(mem_pos, mem_pos + 9);
                mem_pos += 9;
            } else {
                flags3 = 0;
                var body_part = new Uint8Array(9);
            }

            var flags4 = 0;
            if (version >= 13) {
                flags4 = read_buffer_number(arrayBuffer, mem_pos, 4);
                mem_pos += 4;
            }

            var flags5 = 0;
            if (version >= 14) {
                flags5 = read_buffer_number(arrayBuffer, mem_pos, 4);
                mem_pos += 4;
            }

            var reserved2_bytes = null;
            var some_string = "";
            if (version >= 15) {
                reserved2_bytes = arrayBuffer.slice(mem_pos, mem_pos + 25);
                var data_version_15 = hex(arrayBuffer.slice(mem_pos, mem_pos + 25), document.getElementById("using_txt_mode").checked).toUpperCase();
                mem_pos += 25;

                len = read_buffer_number(arrayBuffer, mem_pos, 2);
                mem_pos += 2;
                some_string = read_buffer_string(arrayBuffer, mem_pos, len);
                mem_pos += len;
            }

            var flags6 = 0;
            if (version >= 16) {
                flags6 = read_buffer_number(arrayBuffer, mem_pos, 2);
                mem_pos += 2;
            }

            // Proprietary fields - can be added if proprietary detection is implemented
            var description = "";
            var enable_message = "";
            var disable_message = "";
            var playmod_name = "";
            var gem_drop = 0;
            var item_chi = 0;
            var recipe_a = 0;
            var recipe_b = 0;
            var punch_id = 0;
            var playmods = "";

            if (isProprietary) {
                // Add code to read proprietary fields here if needed
            }

            if (item_id != a) console.log(`Unordered Items at ${a}`);

            // Track custom items vs original items
            if (item_id < 0) {
                customItemsCount++;
            } else {
                originalItemsCount++;
            }

            data_json.items[a] = {}
            data_json.items[a].m_id = item_id
            data_json.items[a].m_editable_type = editable_type
            data_json.items[a].m_item_category = item_category
            data_json.items[a].m_action_type = action_type
            data_json.items[a].m_hit_sound_type = hit_sound_type
            data_json.items[a].m_name = name
            data_json.items[a].m_texture = texture
            data_json.items[a].m_texture_hash = texture_hash
            data_json.items[a].m_visual_effect = item_kind
            data_json.items[a].m_flags1 = val1
            data_json.items[a].m_texture_x = texture_x
            data_json.items[a].m_texture_y = texture_y
            data_json.items[a].m_spread_type = spread_type
            data_json.items[a].m_is_stripey_wallpaper = is_stripey_wallpaper
            data_json.items[a].m_collision_type = collision_type
            data_json.items[a].m_break_hits = break_hits
            data_json.items[a].m_reset_time = drop_chance
            data_json.items[a].m_clothing_type = clothing_type
            data_json.items[a].m_rarity = rarity
            data_json.items[a].m_max_amount = max_amount
            data_json.items[a].m_extra_file = extra_file
            data_json.items[a].m_extra_file_hash = extra_file_hash
            data_json.items[a].m_audio_volume = audio_volume
            data_json.items[a].m_pet_name = pet_name
            data_json.items[a].m_pet_prefix = pet_prefix
            data_json.items[a].m_pet_suffix = pet_suffix
            data_json.items[a].m_pet_ability = pet_ability
            data_json.items[a].m_seed_base = seed_base
            data_json.items[a].m_seed_overlay = seed_overlay
            data_json.items[a].m_tree_base = tree_base
            data_json.items[a].m_tree_leaves = tree_leaves
            data_json.items[a].m_seed_color = argbToInt(seed_color_a, seed_color_r, seed_color_g, seed_color_b)
            data_json.items[a].m_seed_overlay_color = argbToInt(seed_overlay_color_a, seed_overlay_color_r, seed_overlay_color_g, seed_overlay_color_b)
            data_json.items[a].m_ingredient = ingredient
            data_json.items[a].m_grow_time = grow_time
            data_json.items[a].m_flags2 = val2
            data_json.items[a].m_rayman = is_rayman
            data_json.items[a].m_extra_options = extra_options
            data_json.items[a].m_texture2 = texture2
            data_json.items[a].m_extra_options2 = extra_options2
            data_json.items[a].m_punch_options = punch_options
            
            // Add new fields
            data_json.items[a].m_flags3 = flags3
            data_json.items[a].m_body_part = Array.from(body_part || [])
            data_json.items[a].m_flags4 = flags4
            data_json.items[a].m_flags5 = flags5
            data_json.items[a].m_some_string = some_string
            data_json.items[a].m_flags6 = flags6

            // Add proprietary fields if implemented
            if (isProprietary) {
                data_json.items[a].m_description = description
                data_json.items[a].m_enable_message = enable_message
                data_json.items[a].m_disable_message = disable_message
                data_json.items[a].m_playmod_name = playmod_name
                data_json.items[a].m_gem_drop = gem_drop
                data_json.items[a].m_item_chi = item_chi
                data_json.items[a].m_recipe_a = recipe_a
                data_json.items[a].m_recipe_b = recipe_b
                data_json.items[a].m_punch_id = punch_id
                data_json.items[a].m_playmods = playmods
            }
        }

        // Add metadata about the items
        data_json.custom_items_count = customItemsCount;
        data_json.original_items_count = originalItemsCount;
        data_json.is_proprietary = isProprietary;
        if (isProprietary) {
            data_json.proprietary_version = proprietaryVersion;
        }
        
        if (using_editor) {
            if (!$.fn.dataTable.isDataTable("#itemsList")) {
                document.getElementById("itemsList").classList.remove("d-none")
                document.getElementById("save_items_dat_div").classList.remove("d-none")
                $("#itemsList").DataTable({
                    scrollY: "500px",
                    scrollX: true,
                    scrollCollapse: true,
                    paging: true,
                    fixedColumns: {
                        left: 1,
                        right: 1
                    }, "lengthChange": false, "autoWidth": false,
                    "columnDefs": [
                        {
                            "targets": [0],
                            "render": function (data, type, full, meta) {
                                return type === 'display' && typeof data === 'string' ?
                                    data.replace(/</g, '&lt;').replace(/>/g, '&gt;') : data;
                            }
                        }
                    ]
                }).buttons().container().appendTo('#itemsList_wrapper .col-md-6:eq(0)');
                $('#itemsList').DataTable().columns.adjust()
                $(window).resize(function () {
                    $('#itemsList').DataTable().columns.adjust()
                });
            }
            var result = []
            for (let a = 0; a < item_count; a++) {
                result[a] = []
                result[a][0] = data_json.items[a].m_id
                result[a][1] = data_json.items[a].m_name
                result[a][2] = `<center><button class="btn btn-primary" onclick="editItems(${a})">Edit/Info</button></center>`
            }
            $("#itemsList").DataTable().rows.add(result).draw()
            result = []
        } else {
            if (document.getElementById("using_txt_mode").checked) {
                var to_txt_result = `//Credit: IProgramInCPP & GrowtopiaNoobs\n//Format: add_item\\${Object.keys(data_json.items[0]).join("\\")}\n//NOTE: There are several items, for the breakhits part, add 'r'.\n//Example: 184r\n//What does it mean? So, adding 'r' to breakhits makes it raw breakhits, meaning, if you add 'r' to breakhits, when encoding items.dat, the encoder won't multiply it by 6.\n\nversion\\${data_json.version}\nitemCount\\${data_json.item_count}\n\n`;
                for (let a = 0; a < item_count; a++) to_txt_result += "add_item\\" + Object.values(data_json.items[a]).join("\\") + "\n"
                saveData(to_txt_result, "items.txt")
            } else saveData(JSON.stringify(data_json, null, 4), "items.json");
            data_json = {}
        }
    };
};

// Helper function for ARGB to integer conversion
function argbToInt(a, r, g, b) {
    return ((a & 0xFF) << 24) | ((r & 0xFF) << 16) | ((g & 0xFF) << 8) | (b & 0xFF);
}

/**
 * @param {Blob} file
 * @param {boolean} using_editor
 */

function item_encoder(file, using_editor) {
    if (using_editor) {
        process_item_encoder(data_json, 0);
        saveDataBuffer(encoded_buffer_file, "items.dat")
        hash_buffer(encoded_buffer_file, "items_dat_hash_2", "Encoded Items dat Hash: ")
        return encoded_buffer_file = []
    } else {
        var reader = new FileReader();
        reader.readAsText(file);

        reader.onload = function (e) {
            try {
                if (document.getElementById("using_txt_mode").checked) process_item_encoder(e.target.result, 1)
                else process_item_encoder(JSON.parse(e.target.result), 0)
                saveDataBuffer(encoded_buffer_file, "items.dat")

                hash_buffer(encoded_buffer_file, "items_dat_hash_1", "Encoded Items dat Hash: ")
                return encoded_buffer_file = []
            } catch (error) {
                console.error('Error parsing JSON:', error);
            }
        }
    }

}

/**
 * @param {Blob} file
 * @param {boolean} using_editor
 */
function item_decoder(file, using_editor) {
    data_json = {}
    let mem_pos = 6;
    var reader = new FileReader()
    reader.readAsArrayBuffer(file);

    reader.onload = function (e) {
        var arrayBuffer = new Uint8Array(e.target.result);
        var version = read_buffer_number(arrayBuffer, 0, 2);
        var item_count = read_buffer_number(arrayBuffer, 2, 4);

        if (version > 19) {
            return Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            }).fire({
                icon: 'error',
                title: "Your items.dat version is " + version + ", and This decoder doesnt support that version!"
            })
        }
        data_json.version = version
        data_json.item_count = item_count
        data_json.items = []

        for (let a = 0; a < item_count; a++) {
            var item_id = read_buffer_number(arrayBuffer, mem_pos, 4);
            mem_pos += 4;

            var editable_type = arrayBuffer[mem_pos++];
            var item_category = arrayBuffer[mem_pos++];
            var action_type = arrayBuffer[mem_pos++];
            var hit_sound_type = arrayBuffer[mem_pos++];

            var len = read_buffer_number(arrayBuffer, mem_pos, 2)
            mem_pos += 2;
            var name = read_buffer_string(arrayBuffer, mem_pos, len, true, Number(item_id));
            mem_pos += len;

            len = read_buffer_number(arrayBuffer, mem_pos, 2)
            mem_pos += 2;
            var texture = read_buffer_string(arrayBuffer, mem_pos, len);
            mem_pos += len;

            // Remove the .rttex extension
            texture = texture.replace('.rttex', '');

            var texture_hash = read_buffer_number(arrayBuffer, mem_pos, 4);
            mem_pos += 4;

            var item_kind = arrayBuffer[mem_pos++];

            var val1 = read_buffer_number(arrayBuffer, mem_pos, 4);
            mem_pos += 4;

            var texture_x = arrayBuffer[mem_pos++];
            var texture_y = arrayBuffer[mem_pos++];
            var spread_type = arrayBuffer[mem_pos++];
            var is_stripey_wallpaper = arrayBuffer[mem_pos++];
            var collision_type = arrayBuffer[mem_pos++];
            var break_hits = arrayBuffer[mem_pos++];

            if ((break_hits % 6) !== 0) break_hits = break_hits + "r"
            else break_hits = break_hits / 6

            var drop_chance = read_buffer_number(arrayBuffer, mem_pos, 4);
            mem_pos += 4;

            var clothing_type = arrayBuffer[mem_pos++];

            var rarity = read_buffer_number(arrayBuffer, mem_pos, 2);
            mem_pos += 2;

            var max_amount = arrayBuffer[mem_pos++];

            len = read_buffer_number(arrayBuffer, mem_pos, 2)
            mem_pos += 2;
            var extra_file = read_buffer_string(arrayBuffer, mem_pos, len);
            mem_pos += len;

            var extra_file_hash = read_buffer_number(arrayBuffer, mem_pos, 4);
            mem_pos += 4;

            var audio_volume = read_buffer_number(arrayBuffer, mem_pos, 4);
            mem_pos += 4;

            len = read_buffer_number(arrayBuffer, mem_pos, 2)
            mem_pos += 2;
            var pet_name = read_buffer_string(arrayBuffer, mem_pos, len);
            mem_pos += len;

            len = read_buffer_number(arrayBuffer, mem_pos, 2)
            mem_pos += 2;
            var pet_prefix = read_buffer_string(arrayBuffer, mem_pos, len);
            mem_pos += len;

            len = read_buffer_number(arrayBuffer, mem_pos, 2)
            mem_pos += 2;
            var pet_suffix = read_buffer_string(arrayBuffer, mem_pos, len);
            mem_pos += len;

            len = read_buffer_number(arrayBuffer, mem_pos, 2);
            mem_pos += 2;
            var pet_ability = read_buffer_string(arrayBuffer, mem_pos, len);
            mem_pos += len;

            var seed_base = arrayBuffer[mem_pos++];
            var seed_overlay = arrayBuffer[mem_pos++];
            var tree_base = arrayBuffer[mem_pos++];
            var tree_leaves = arrayBuffer[mem_pos++];

            var seed_color_a = arrayBuffer[mem_pos++];
            var seed_color_r = arrayBuffer[mem_pos++];
            var seed_color_g = arrayBuffer[mem_pos++];
            var seed_color_b = arrayBuffer[mem_pos++];
            var seed_overlay_color_a = arrayBuffer[mem_pos++];
            var seed_overlay_color_r = arrayBuffer[mem_pos++];
            var seed_overlay_color_g = arrayBuffer[mem_pos++];
            var seed_overlay_color_b = arrayBuffer[mem_pos++];

            mem_pos += 4; // skipping ingredients

            var grow_time = read_buffer_number(arrayBuffer, mem_pos, 4);
            mem_pos += 4;

            var val2 = read_buffer_number(arrayBuffer, mem_pos, 2);
            mem_pos += 2;
            var is_rayman = read_buffer_number(arrayBuffer, mem_pos, 2);
            mem_pos += 2;

            len = read_buffer_number(arrayBuffer, mem_pos, 2)
            mem_pos += 2;
            var extra_options = read_buffer_string(arrayBuffer, mem_pos, len);
            mem_pos += len;

            len = read_buffer_number(arrayBuffer, mem_pos, 2)
            mem_pos += 2;
            var texture2 = read_buffer_string(arrayBuffer, mem_pos, len);
            mem_pos += len;

            len = read_buffer_number(arrayBuffer, mem_pos, 2)
            mem_pos += 2;
            var extra_options2 = read_buffer_string(arrayBuffer, mem_pos, len);
            mem_pos += len;

            var data_position_80 = hex(arrayBuffer.slice(mem_pos, mem_pos + 80), document.getElementById("using_txt_mode").checked).toUpperCase()
            mem_pos += 80;

            if (version >= 11) {
                len = read_buffer_number(arrayBuffer, mem_pos, 2)
                mem_pos += 2;
                var punch_options = read_buffer_string(arrayBuffer, mem_pos, len);
                mem_pos += len;
            }

            if (version >= 12) {
                var data_version_12 = hex(arrayBuffer.slice(mem_pos, mem_pos + 13), document.getElementById("using_txt_mode").checked).toUpperCase()
                mem_pos += 13;
            }

            if (version >= 13) {
                var int_version_13 = read_buffer_number(arrayBuffer, mem_pos, 4)
                mem_pos += 4;
            }

            if (version >= 14) {
                var int_version_14 = read_buffer_number(arrayBuffer, mem_pos, 4)
                mem_pos += 4;
            }

            if (version >= 15) {
                var data_version_15 = hex(arrayBuffer.slice(mem_pos, mem_pos + 25), document.getElementById("using_txt_mode").checked).toUpperCase()
                mem_pos += 25;

                len = read_buffer_number(arrayBuffer, mem_pos, 2);
                mem_pos += 2;
                var str_version_15 = read_buffer_string(arrayBuffer, mem_pos, len);
                mem_pos += len
            }
            if (version >= 16) {
                len = read_buffer_number(arrayBuffer, mem_pos, 2)
                mem_pos += 2;
                var str_version_16 = read_buffer_string(arrayBuffer, mem_pos, len);
                mem_pos += len
            }

            if (version >= 17) {
                var int_version_17 = read_buffer_number(arrayBuffer, mem_pos, 4)
                mem_pos += 4;
            }

            if (version >= 18) {
                var int_version_18 = read_buffer_number(arrayBuffer, mem_pos, 4)
                mem_pos += 4;
            }

            if (version >= 19) {
                var int_version_19 = read_buffer_number(arrayBuffer, mem_pos, 9)
                mem_pos += 9;
            }

            if (item_id != a) console.log(`Unordered Items at ${a}`)

            data_json.items[a] = {}
            data_json.items[a].m_id = item_id
            data_json.items[a].m_name = name
            data_json.items[a].m_seed_base = seed_base

            data_json.items[a].m_seed_color = argbToInt(seed_color_a, seed_color_r, seed_color_g, seed_color_b);
            data_json.items[a].m_seed_overlay = seed_overlay;
            data_json.items[a].m_seed_overlay_color = argbToInt(seed_overlay_color_a, seed_overlay_color_r, seed_overlay_color_g, seed_overlay_color_b);

            data_json.items[a].m_spread_type = spread_type

            data_json.items[a].m_texture = texture
            data_json.items[a].m_texture_x = texture_x
            data_json.items[a].m_texture_y = texture_y
            data_json.items[a].m_tree_base = tree_base
            data_json.items[a].m_tree_leaves = tree_leaves

        }
        if (using_editor) {
            if (!$.fn.dataTable.isDataTable("#itemsList")) {
                document.getElementById("itemsList").classList.remove("d-none")
                document.getElementById("save_items_dat_div").classList.remove("d-none")
                $("#itemsList").DataTable({
                    scrollY: "500px",
                    scrollX: true,
                    scrollCollapse: true,
                    paging: true,
                    fixedColumns: {
                        left: 1,
                        right: 1
                    }, "lengthChange": false, "autoWidth": false,
                    "columnDefs": [
                        {
                            "targets": [0],
                            "render": function (data, type, full, meta) {
                                return type === 'display' && typeof data === 'string' ?
                                    data.replace(/</g, '&lt;').replace(/>/g, '&gt;') : data;
                            }
                        }
                    ]
                }).buttons().container().appendTo('#itemsList_wrapper .col-md-6:eq(0)');
                $('#itemsList').DataTable().columns.adjust()
                $(window).resize(function () {
                    $('#itemsList').DataTable().columns.adjust()
                });
            }
            var result = []
            for (let a = 0; a < item_count; a++) {
                result[a] = []
                result[a][0] = data_json.items[a].item_id
                result[a][1] = data_json.items[a].name
                result[a][2] = `<center><button class="btn btn-primary" onclick="editItems(${a})">Edit/Info</button></center>`
            }
            $("#itemsList").DataTable().rows.add(result).draw()
            result = []
        } else {
            if (document.getElementById("using_txt_mode").checked) {
                var to_txt_result = `//Credit: IProgramInCPP & GrowtopiaNoobs\n//Format: add_item\\${Object.keys(data_json.items[0]).join("\\")}\n//NOTE: There are several items, for the breakhits part, add 'r'.\n//Example: 184r\n//What does it mean? So, adding 'r' to breakhits makes it raw breakhits, meaning, if you add 'r' to breakhits, when encoding items.dat, the encoder won't multiply it by 6.\n\nversion\\${data_json.version}\nitemCount\\${data_json.item_count}\n\n`;
                for (let a = 0; a < item_count; a++) to_txt_result += "add_item\\" + Object.values(data_json.items[a]).join("\\") + "\n"
                saveData(to_txt_result, "items.txt")
            } else saveData(JSON.stringify(data_json, null, 4), "items.json");
            data_json = {}
        }
    };
};

function editItems(posArray) {
    $("#modal-editItems").modal("show")
    document.getElementById("item_id").value = data_json.items[posArray].item_id
    document.getElementById("editable_type").value = data_json.items[posArray].editable_type
    document.getElementById("item_category").value = data_json.items[posArray].item_category
    document.getElementById("action_type").value = data_json.items[posArray].action_type
    document.getElementById("hit_sound_type").value = data_json.items[posArray].hit_sound_type
    document.getElementById("name").value = data_json.items[posArray].name
    document.getElementById("texture").value = data_json.items[posArray].texture
    document.getElementById("texture_hash").value = data_json.items[posArray].texture_hash
    document.getElementById("item_kind").value = data_json.items[posArray].item_kind
    document.getElementById("val1").value = data_json.items[posArray].val1
    document.getElementById("texture_x").value = data_json.items[posArray].texture_x
    document.getElementById("texture_y").value = data_json.items[posArray].texture_y
    document.getElementById("spread_type").value = data_json.items[posArray].spread_type
    document.getElementById("is_stripey_wallpaper").value = data_json.items[posArray].is_stripey_wallpaper
    document.getElementById("collision_type").value = data_json.items[posArray].collision_type
    document.getElementById("break_hits").value = data_json.items[posArray].break_hits
    document.getElementById("drop_chance").value = data_json.items[posArray].drop_chance
    document.getElementById("clothing_type").value = data_json.items[posArray].clothing_type
    document.getElementById("rarity").value = data_json.items[posArray].rarity
    document.getElementById("max_amount").value = data_json.items[posArray].max_amount
    document.getElementById("extra_file").value = data_json.items[posArray].extra_file
    document.getElementById("extra_file_hash").value = data_json.items[posArray].extra_file_hash
    document.getElementById("audio_volume").value = data_json.items[posArray].audio_volume
    document.getElementById("pet_name").value = data_json.items[posArray].pet_name
    document.getElementById("pet_prefix").value = data_json.items[posArray].pet_prefix
    document.getElementById("pet_suffix").value = data_json.items[posArray].pet_suffix
    document.getElementById("pet_ability").value = data_json.items[posArray].pet_ability
    document.getElementById("seed_base").value = data_json.items[posArray].seed_base
    document.getElementById("seed_overlay").value = data_json.items[posArray].seed_overlay
    document.getElementById("tree_base").value = data_json.items[posArray].tree_base
    document.getElementById("tree_leaves").value = data_json.items[posArray].tree_leaves
    document.getElementById("seed_color").value = Object.values(data_json.items[posArray].seed_color).toString()
    document.getElementById("seed_overlay_color").value = Object.values(data_json.items[posArray].seed_overlay_color).toString()
    document.getElementById("grow_time").value = data_json.items[posArray].grow_time
    document.getElementById("val2").value = data_json.items[posArray].val2
    document.getElementById("is_rayman").value = data_json.items[posArray].is_rayman
    document.getElementById("extra_options").value = data_json.items[posArray].extra_options
    document.getElementById("texture2").value = data_json.items[posArray].texture2
    document.getElementById("extra_options2").value = data_json.items[posArray].extra_options2
    document.getElementById("pos_80_data").value = data_json.items[posArray].data_position_80
    document.getElementById("punch_options").value = data_json.items[posArray].punch_options
    document.getElementById("data_version_12").value = data_json.items[posArray].data_version_12
    document.getElementById("int_version_13").value = data_json.items[posArray].int_version_13
    document.getElementById("int_version_14").value = data_json.items[posArray].int_version_14
    document.getElementById("data_version_15").value = data_json.items[posArray].data_version_15
    document.getElementById("str_version_15").value = data_json.items[posArray].str_version_15
    document.getElementById("str_version_16").value = data_json.items[posArray].str_version_16
    document.getElementById("int_version_17").value = data_json.items[posArray].int_version_17
    document.getElementById("int_version_18").value = data_json.items[posArray].int_version_18
    document.getElementById("int_version_19").value = data_json.items[posArray].int_version_19
    document.getElementById("editItemsButton").setAttribute("onclick", `processEditItems(${posArray})`)
}

function processEditItems(posArray) {
    data_json.items[posArray].item_id = document.getElementById("item_id").value
    data_json.items[posArray].editable_type = document.getElementById("editable_type").value
    data_json.items[posArray].item_category = document.getElementById("item_category").value
    data_json.items[posArray].action_type = document.getElementById("action_type").value
    data_json.items[posArray].hit_sound_type = document.getElementById("hit_sound_type").value
    data_json.items[posArray].name = document.getElementById("name").value
    data_json.items[posArray].texture = document.getElementById("texture").value
    data_json.items[posArray].texture_hash = document.getElementById("texture_hash").value
    data_json.items[posArray].item_kind = document.getElementById("item_kind").value
    data_json.items[posArray].val1 = document.getElementById("val1").value
    data_json.items[posArray].texture_x = document.getElementById("texture_x").value
    data_json.items[posArray].texture_y = document.getElementById("texture_y").value
    data_json.items[posArray].spread_type = document.getElementById("spread_type").value
    data_json.items[posArray].is_stripey_wallpaper = document.getElementById("is_stripey_wallpaper").value
    data_json.items[posArray].collision_type = document.getElementById("collision_type").value
    data_json.items[posArray].break_hits = document.getElementById("break_hits").value
    data_json.items[posArray].drop_chance = document.getElementById("drop_chance").value
    data_json.items[posArray].clothing_type = document.getElementById("clothing_type").value
    data_json.items[posArray].rarity = document.getElementById("rarity").value
    data_json.items[posArray].max_amount = document.getElementById("max_amount").value
    data_json.items[posArray].extra_file = document.getElementById("extra_file").value
    data_json.items[posArray].extra_file_hash = document.getElementById("extra_file_hash").value
    data_json.items[posArray].audio_volume = document.getElementById("audio_volume").value
    data_json.items[posArray].pet_name = document.getElementById("pet_name").value
    data_json.items[posArray].pet_prefix = document.getElementById("pet_prefix").value
    data_json.items[posArray].pet_suffix = document.getElementById("pet_suffix").value
    data_json.items[posArray].pet_ability = document.getElementById("pet_ability").value
    data_json.items[posArray].seed_base = document.getElementById("seed_base").value
    data_json.items[posArray].seed_overlay = document.getElementById("seed_overlay").value
    data_json.items[posArray].tree_base = document.getElementById("tree_base").value
    data_json.items[posArray].tree_leaves = document.getElementById("tree_leaves").value

    var to_arr = document.getElementById("seed_color").value.split(",")
    data_json.items[posArray].seed_color.a = to_arr[0]
    data_json.items[posArray].seed_color.r = to_arr[1]
    data_json.items[posArray].seed_color.g = to_arr[2]
    data_json.items[posArray].seed_color.b = to_arr[3]

    to_arr = document.getElementById("seed_overlay_color").value.split(",")
    data_json.items[posArray].seed_overlay_color.a = to_arr[0]
    data_json.items[posArray].seed_overlay_color.r = to_arr[1]
    data_json.items[posArray].seed_overlay_color.g = to_arr[2]
    data_json.items[posArray].seed_overlay_color.b = to_arr[3]

    data_json.items[posArray].grow_time = document.getElementById("grow_time").value
    data_json.items[posArray].val2 = document.getElementById("val2").value
    data_json.items[posArray].is_rayman = document.getElementById("is_rayman").value
    data_json.items[posArray].extra_options = document.getElementById("extra_options").value
    data_json.items[posArray].texture2 = document.getElementById("texture2").value
    data_json.items[posArray].extra_options2 = document.getElementById("extra_options2").value
    data_json.items[posArray].data_position_80 = document.getElementById("pos_80_data").value
    data_json.items[posArray].punch_options = document.getElementById("punch_options").value
    data_json.items[posArray].data_version_12 = document.getElementById("data_version_12").value
    data_json.items[posArray].int_version_13 = document.getElementById("int_version_13").value
    data_json.items[posArray].int_version_14 = document.getElementById("int_version_14").value
    data_json.items[posArray].data_version_15 = document.getElementById("data_version_15").value
    data_json.items[posArray].str_version_15 = document.getElementById("str_version_15").value
    data_json.items[posArray].str_version_16 = document.getElementById("str_version_16").value
    data_json.items[posArray].int_version_17 = document.getElementById("int_version_17").value
    data_json.items[posArray].int_version_18 = document.getElementById("int_version_18").value
    data_json.items[posArray].int_version_19 = document.getElementById("int_version_19").value
    $("#modal-editItems").modal("hide")
}
