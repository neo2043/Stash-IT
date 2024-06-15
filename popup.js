const fileInput = document.getElementById('fileInput');
const down_specific_tab_group_button = document.querySelector("#download_specific_tab_bookmark_group");
const specific_tab_group_div = document.querySelector("#specific_tab_bookmark_group_div");
const importJson = document.querySelector("#import");
const importJson_after = document.querySelector("#import_after");
const submitJson = document.querySelector("#submitJson");
const jsonData = document.querySelector("#jsonData");

const tabs = await chrome.tabs.query({});
const groups = await chrome.tabGroups.query({});
const bookmarks = await chrome.bookmarks.getTree();

function all_data(){
    var grouped_data = {
        "tabs": groups.map((group) => {
            return {
                "group_title": group.title,
                "group_color": group.color,
                "group_tabs": tabs
                    .filter((tab) => {
                        return tab.groupId === group.id
                    })
                    .map((tab) => {
                        return { "tab_title": tab.title, "tab_url": tab.url }
                    })
            }
        })
    }

    grouped_data.tabs.push({
        "free_tabs": tabs
            .filter((tabs) => {
                return tabs.groupId === -1
            })
            .map((tabs) => {
                return { "tab_title": tabs.title, "tab_url": tabs.url }
            })
    });

    grouped_data.bookmarks = bookmarks[0].children[0].children.map((element) => {
        if (element.children) {
            return {
                "group_title": element.title,
                "bookmarks": element.children.map((element) => {
                    return { "bookmark_title": element.title, "bookmark_url": element.url }
                })
            }
        }
        else {
            return { "bookmark_title": element.title, "bookmark_url": element.url }
        }
    })

    return new Promise((resolve)=>{
        resolve(grouped_data);
    });
}

document.querySelector("#download_1").addEventListener("click",async () => {
    var jsonName = window.prompt("enter the name: ")
    console.log(jsonName)
    var grouped_data =await all_data();
    var blob = new Blob([JSON.stringify(grouped_data)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    chrome.downloads.download({
        url: url,
        filename: jsonName
    });
})

document.querySelector("#download_2").addEventListener("click",async () => {
    var grouped_data = await all_data();
    navigator.clipboard.writeText(JSON.stringify(grouped_data));
})


importJson.addEventListener("click",()=>{
    importJson.style.display="none";
    importJson_after.style.display="inherit";
})

submitJson.addEventListener("click",()=>{
    try {
        tabs_bookmark_generator_json(JSON.parse(jsonData.value));
    } catch (error) {
        if(error instanceof(SyntaxError)){
            tabs_generator_plain(jsonData.value)
        }
    }
})

fileInput.onchange = () => {
    const selectedFile = fileInput.files[0];
    var reader = new FileReader();
    reader.readAsText(selectedFile);
    reader.onload = function (e) {
        try {
            tabs_bookmark_generator_json(JSON.parse(e.target.result));
        } catch (error) {
            if(error instanceof(SyntaxError)){
                tabs_generator_plain(e.target.result)
            }
        }
    }
}

const tabs_generator_plain = (data) => {
    plain_parse(data).forEach(async (clean_link) => {
        await chrome.tabs.create({url:clean_link})
    })
}

const plain_parse = (data) => {
    const regexStr = "\\b((?:https?|ftp|file):"
                                + "\\/\\/[a-zA-Z0-9+&@#\\/%?=~_|!:,.;]*"
                                + "[a-zA-Z0-9+&@#\\/%=~_|])"
    const regex = new RegExp(regexStr, 'gi')
    let match
    let urlList = [];
    while ((match = regex.exec(data)) !== null){
        urlList.push(match[0])
    }
    return urlList
}

const tabs_bookmark_generator_json = (json) => {
    if(json.tabs.length!=0){
        json.tabs.forEach((element) => {
            if (element.group_title || element.group_title == "") {
                if (element.group_title !== "") {
                    const tabIdsPromiseArray = element.group_tabs.map(({ tab_url }) => {
                        return new Promise(resolve => {
                            chrome.tabs.create({ url: tab_url }, tab => {
                                resolve(tab.id);
                            });
                        });
                    });

                    Promise.all(tabIdsPromiseArray)
                        .then(async (tabIds) => {
                            const group = await chrome.tabs.group({ tabIds });
                            await chrome.tabGroups.update(group, { title: element.group_title, color: element.group_color });
                        })
                        .catch(error => {
                            console.error('Error:', error);
                        });
                }
                else {
                    const tabIdsPromiseArray = element.group_tabs.map(({ tab_url }) => {
                        return new Promise(resolve => {
                            chrome.tabs.create({ url: tab_url }, tab => {
                                resolve(tab.id);
                            });
                        });
                    });

                    Promise.all(tabIdsPromiseArray)
                        .then(async (tabIds) => {
                            const group = await chrome.tabs.group({ tabIds });
                            await chrome.tabGroups.update(group, { color: element.group_color });
                        })
                        .catch(error => {
                            console.error('Error:', error);
                        });
                }
            }
            else {
                element.free_tabs.map(({ tab_url }) => {
                    chrome.tabs.create({ url: tab_url });
                });
            }
        });
    }  

    if(json.bookmarks.length!=0){
        json.bookmarks.forEach((element) => {
            if (element.group_title) {
                chrome.bookmarks.create(
                    {
                        parentId: "1",
                        title: element.group_title,
                        url: null
                    }
                )
                    .then((folder) => {
                        element.bookmarks.forEach((element) => {
                            chrome.bookmarks.create(
                                {
                                    parentId: folder.id,
                                    title: element.bookmark_title,
                                    url: element.bookmark_url
                                }
                            )
                        })
                    });
            }
            else {
                chrome.bookmarks.create(
                    {
                        parentId: "1",
                        title: element.bookmark_title,
                        url: element.bookmark_url
                    }
                );
            }
        })
    }
    
}

async function specifics(){
    var grouped_data={}
    grouped_data.tabs = Array.from(document.querySelectorAll("input[type=checkbox]"))
                        .filter((checkbox) => {
                            if (checkbox.checked) {
                                if (checkbox.name.includes("tab_group")) {
                                    return true
                                }
                            }
                            else {
                                return false
                            }
                        })
                        .map((checkbox) => {
                            return groups
                                .filter((group) => {
                                    return group.id == checkbox.id
                                })
                                .map((group) => {
                                    return {
                                        "group_title": group.title,
                                        "group_color": group.color,
                                        "group_tabs": tabs
                                            .filter((tabs) => {
                                                return tabs.groupId == group.id
                                            })
                                            .map((tabs) => {
                                                return { "tab_name": tabs.title, "tab_url": tabs.url }
                                            })
                                    }
                                })[0]
                        })

    grouped_data.bookmarks= await Promise.all(Array.from(document.querySelectorAll("input[type=checkbox]"))
                            .filter((checkbox) => {
                                if (checkbox.checked) {
                                    if (checkbox.name.includes("bookmark_group")) {
                                        return true
                                    }
                                }
                                else {
                                    return false
                                }
                            })
                            .map(async (element) => {
                                var parentData = await chrome.bookmarks.get(element.id)
                                var childrenData = await chrome.bookmarks.getChildren(element.id)
                                return {
                                    "group_title": parentData[0].title,
                                    "bookmarks": childrenData.map((element) => {
                                        return {
                                            "bookmark_title": element.title,
                                            "bookmark_url": element.url
                                        }
                                    })
                                }
                            }))

    return new Promise((resolve)=>{
        resolve(grouped_data);
    });
}

down_specific_tab_group_button.addEventListener("click", async () => {
    if (down_specific_tab_group_button.innerText !== "Download Selected") {
        const parent_div = document.createElement("div");
        const head_h3_1 = document.createElement("h3");
        const head_h3_2 = document.createElement("h3");
        const parentNode = down_specific_tab_group_button.parentElement;
        const btn_2 = document.createElement("button");

        head_h3_1.innerText = "Tab Group";
        parent_div.appendChild(head_h3_1);
        groups.forEach((group, index) => {
            const div = document.createElement("div")
            const input_label = document.createElement("label");
            input_label.setAttribute('for', group.id);
            input_label.innerText = group.title == "" ? group.color + " (no_name)" : group.title;
            const input_checkbox = document.createElement("input");
            input_checkbox.type = "checkbox";
            input_checkbox.name = "tab_group-" + index;
            input_checkbox.id = group.id;
            div.appendChild(input_checkbox);
            div.appendChild(input_label);
            parent_div.appendChild(div);
            specific_tab_group_div.appendChild(parent_div);
        });

        head_h3_2.innerText = "Bookmark Group";
        parent_div.appendChild(head_h3_2);
        bookmarks[0].children[0].children.forEach((element, index) => {
            if (element.children) {
                const div = document.createElement("div")
                const input_label = document.createElement("label");
                input_label.setAttribute('for', element.id);
                input_label.innerText = element.title;
                const input_checkbox = document.createElement("input");
                input_checkbox.type = "checkbox";
                input_checkbox.id = element.id;
                input_checkbox.name = "bookmark_group-" + index;
                div.appendChild(input_checkbox);
                div.appendChild(input_label);
                parent_div.appendChild(div)
                specific_tab_group_div.appendChild(parent_div);
            }
        })
        down_specific_tab_group_button.innerText = "Download Selected";
        down_specific_tab_group_button.style.width = "50%";
        down_specific_tab_group_button.style.marginRight = "5px";
        btn_2.innerText = "Copy Selected";
        btn_2.style.width = "50%";
        btn_2.addEventListener("click",async ()=>{
            var grouped_data = await specifics();
            if (grouped_data.bookmarks.length!=0 || grouped_data.tabs.length!= 0) {
                navigator.clipboard.writeText(JSON.stringify(grouped_data));
            }
        });
        parentNode.style.marginTop="10px";
        parentNode.appendChild(btn_2);
        return;
    }

    var grouped_data = await specifics();
    
    if (grouped_data.bookmarks.length!=0 || grouped_data.tabs.length!= 0) {
        var jsonName = window.prompt("enter the name: ")
        var blob = new Blob([JSON.stringify(grouped_data)], { type: "application/json" });
        var url = URL.createObjectURL(blob);
        chrome.downloads.download({
            url: url,
            filename: jsonName
        });
    }
});