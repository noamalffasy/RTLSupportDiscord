//META{"name":"RTLPlugin"}*//

class RTLPlugin {
  getName() {
    return "RTL Plugin";
  }

  getDescription() {
    return "It adds RTL support to chat";
  }

  getVersion() {
    return "1.0.0";
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
    this.unpatchMessages();
  }

  observer(changes) {}

  initialize() {
    this.injectCSS();
    this.patchMessages();
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
      `textarea { 
        unicode-bidi: plaintext; 
      } 
      
      .containerCozy-336-Cz { 
        display: flex; 
      } 
      
      .containerCozy-336-Cz .buttonContainer-KtQ8wc { 
        order: 2; 
      } 

      .containerCozy-336-Cz.rtl .buttonContainer-KtQ8wc .buttonContainer-37UsAw {
        flex-direction: row-reverse;
      }

      .containerCozy-336-Cz.rtl .buttonContainer-KtQ8wc .buttonContainer-37UsAw div:last-child {
        margin: 0;
      }
      
      .containerCozy-336-Cz .markup-2BOw-j { 
        flex: 1 1 0; 
        order: 1; 
      }
      
      .containerCozy-336-Cz.rtl .markup-2BOw-j {
        margin-right: 11px;
        order: 3;
      }`
    );
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
          if (
            getComputedStyle(elem.querySelector("div[class^='markup']"))
              .direction === "rtl"
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

  unpatchMessages() {
    for (let cancel of this.cancelPatches) {
      cancel();
    }
  }
}
