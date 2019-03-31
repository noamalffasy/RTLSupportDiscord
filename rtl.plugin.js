//META{"name":"RTLPlugin"}*//

class RTLPlugin {
  getName() {
    return "RTL Plugin";
  }

  getDescription() {
    return "It adds RTL support to chat";
  }

  getVersion() {
    return "1.0.2";
  }

  getAuthor() {
    return "Noam Alffasy";
  }

  load() {
    this.cancelPatches = [];
  }

  start() {
    this.downloadLib();
  }

  stop() {
    BdApi.clearCSS("rtlSupport");
    this.unpatchAll();
  }

  observer(changes) {}

  initialize() {
    this.injectCSS();
    this.patchMessages();
    this.patchEmbeds();
  }

  downloadLib() {
    // Taken from https://rauenzi.github.io/BDPluginLibrary/docs/#using-remote-library
    // Changed for the DiscordInternals library

    if (!window.DiscordInternals) {
      const libScript = document.createElement("script");
      libScript.setAttribute("type", "text/javascript");
      libScript.setAttribute(
        "src",
        "https://raw.githubusercontent.com/samogot/betterdiscord-plugins/master/v1/1lib_discord_internals.plugin.js"
      );
      libScript.setAttribute("id", "LibDiscordInternalsScript");
      document.head.appendChild(libScript);
    }

    if (window.DiscordInternals) {
      this.initialize();
    } else {
      libScript.addEventListener("load", () => {
        this.initialize();
      });
    }
  }

  injectCSS() {
    BdApi.injectCSS(
      "rtlSupport",
      `${this.messagesCSS()}
      ${this.embedsCSS()}`
    );
  }

  messagesCSS() {
    return `textarea { 
      unicode-bidi: plaintext; 
    } 
    
    .containerCozy-336-Cz { 
      display: flex; 
    } 
    
    .containerCozy-336-Cz .buttonContainer-KtQ8wc { 
      order: 2; 
    } 

    .containerCozy-336-Cz.rtl .buttonContainer-KtQ8wc .buttonContainer-37UsAw {
      margin: 0.2rem 0 0 0;
      align-items: start;
      flex-direction: row-reverse;
    }

    .containerCozy-336-Cz.rtl .buttonContainer-KtQ8wc .buttonContainer-37UsAw div:last-child {
      margin: 0;
    }
    
    .containerCozy-336-Cz .markup-2BOw-j { 
      unicode-bidi: plaintext;
      flex: 1 1 0; 
      order: 1; 
    }
    
    .containerCozy-336-Cz.rtl .markup-2BOw-j {
      margin-right: 11px;
      text-align: right;
      order: 3;
    }
    
    .containerCozy-336-Cz .markup-2BOw-j span[class^='mention'] {
      unicode-bidi: plaintext;
    }`;
  }

  embedsCSS() {
    return `.containerCozy-B4noqO.rtl {
      align-items: flex-end;
    }

    .containerCozy-B4noqO .markup-2BOw-j a { 
      direction: unset;
      unicode-bidi: embed;
    }`;
  }

  patchMessages() {
    const { ReactComponents, Renderer } = window.DiscordInternals;
    const {
      React,
      ReactDOM: { findDOMNode },
      findModuleByProps
    } = BdApi;

    ReactComponents.get("MessageContent", msg => {
      const cancel = Renderer.patchRender(msg, [
        {
          selector: {
            type: findModuleByProps("BackgroundOpacityContext")
              .BackgroundOpacityContext
          },
          method: "patchRenderProp",
          content: _ => ({
            propName: "children",
            actions: [
              {
                selector: { className: /^markup/ },
                method: "replace",
                content: (_, elem) =>
                  React.cloneElement(elem, {
                    className: elem.props.className,
                    dir: "auto"
                  })
              }
            ]
          })
        }
      ]);

      this.cancelPatches.push(cancel);

      const that = this;

      const fixButtonDirection = function() {
        // const cancel = monkeyPatch(this, "render", {
        //   silent: true,
        //   after: data => {
        //     const { item, parent, key } = Renderer.getFirstChild(data, "returnValue", { className: /^markup/ });
        //     console.log(data, item);

        //     if (data.returnValue) {
        //       const isRTL =
        //         getComputedStyle(
        //           findDOMNode(data.thisObject).querySelector("div[class^='markup']")
        //         ).direction === "rtl";

        //       data.returnValue.children = React.cloneElement(item, {
        //         className: isRTL
        //           ? `${item.props.className} rtl`
        //           : item.props.className,
        //         dir: "auto"
        //       });
        //     }
        //   }
        // });

        // const cancel = Renderer.patchRender(this, [
        //   {
        //     selector: { className: "markup-2BOw-j" },
        //     method: "replace",
        //     content: (_, elem) => {
        //       const isRTL =
        //         getComputedStyle(
        //           findDOMNode(obj).querySelector("div[class^='markup']")
        //         ).direction === "rtl";

        //       return React.cloneElement(elem, {
        //         className: isRTL
        //           ? `${elem.props.className} rtl`
        //           : elem.props.className,
        //         dir: "auto"
        //       });
        //     }
        //   }
        // ]);

        const elem = findDOMNode(this);
        if (elem.querySelector("div[class^='markup']")) {
          const elemTxt = elem.innerText;
          let latinLettersInTxt = elemTxt.match(/([A-Za-z])/g) || [];

          if (elem.querySelector("a")) {
            latinLettersInTxt = latinLettersInTxt.filter(
              letter => !elem.querySelector("a").innerText.includes(letter)
            );
          }

          if (
            getComputedStyle(elem.querySelector("div[class^='markup']"))
              .direction === "rtl" ||
            elemTxt.length - latinLettersInTxt.length >
              latinLettersInTxt.length
          ) {
            elem.classList.add("rtl");
          } else {
            if (elem.classList.contains("rtl")) {
              elem.classList.remove("rtl");
            }
          }
        }

        const cancel = () => {
          const elem = findDOMNode(this);
          if (elem.querySelector("div[class^='markup']")) {
            if (elem.classList.contains("rtl")) {
              elem.classList.remove("rtl");
            }
          }
        };

        that.cancelPatches.push(cancel);
      };

      msg.prototype.componentDidMount = fixButtonDirection;
      msg.prototype.componentDidUpdate = fixButtonDirection;

      this.cancelPatches.push(
        Renderer.rebindMethods(msg, ["componentDidMount", "componentDidUpdate"])
      );
    });
  }

  patchEmbeds() {
    const { ReactComponents, Renderer } = window.DiscordInternals;
    const {
      React,
      ReactDOM: { findDOMNode }
    } = BdApi;

    ReactComponents.get("Embed", embed => {
      const cancel = Renderer.patchRender(embed, [
        {
          selector: {
            className: /^embedWrapper/
          },
          method: "replaceChildren",
          content: (_, elem) =>
            React.cloneElement(elem, {
              className: elem.props.className,
              dir: "auto"
            })
        }
      ]);

      this.cancelPatches.push(cancel);

      const that = this;

      const fixDirection = function() {
        const elem = findDOMNode(this);

        if (elem.querySelector("a[class^='anchor']")) {
          if (
            getComputedStyle(elem.querySelector("a[class^='anchor']"))
              .direction === "rtl"
          ) {
            elem.parentElement.classList.add("rtl");
          } else {
            if (elem.parentElement.classList.contains("rtl")) {
              elem.parentElement.classList.remove("rtl");
            }
          }
        }

        const cancel = () => {
          const elem = findDOMNode(this);
          if (elem.querySelector("a[class^='anchor']")) {
            if (elem.parentElement.classList.contains("rtl")) {
              elem.parentElement.classList.remove("rtl");
            }
          }
        };

        that.cancelPatches.push(cancel);
      };

      embed.prototype.componentDidMount = fixDirection;
      embed.prototype.componentDidUpdate = fixDirection;

      this.cancelPatches.push(
        Renderer.rebindMethods(embed, [
          "componentDidMount",
          "componentDidUpdate"
        ])
      );
    });
  }

  unpatchAll() {
    for (let cancel of this.cancelPatches) {
      cancel();
    }
  }
}
