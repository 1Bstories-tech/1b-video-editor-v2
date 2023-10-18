"use client";
import { Provider, useDispatch, useSelector } from "react-redux";
import {
  getGlobalTime,
  getOverrides,
  getSelectedElement,
  getSelectedElementId,
  getTemplateJSON,
  getTimelineTracks,
  handleElementClick,
  setActiveCompositionId,
  setActiveElementId,
  setCreatomateState,
  setGlobalTime,
  store,
  getIsPlaying,
  setIsPlaying,
  getCreatomateState,
  findNestedParentById,
  findNestedElementById,
} from "./store.js";
import { Preview } from "@creatomate/preview";
import { useEffect, useRef, useState } from "react";
import _ from "lodash";
import { produce, current } from "immer";
import { enablePatches } from "immer";
import { previewEmitter } from "@/app/video/previewEmitter";

enablePatches();

function createUniqueId() {
  var date = new Date().getTime();
  var uniqueId = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
    /[xy]/g,
    function (c) {
      var r = (date + Math.random() * 16) % 16 | 0;
      date = Math.floor(date / 16);
      return (c == "x" ? r : (r & 0x3) | 0x8).toString(16);
    },
  );
  return uniqueId;
}

let changes = [];
let inverseChanges = [];
const TreeComponent = ({ element }) => {
  const selectedElement = useSelector(getSelectedElement);
  const dispatch = useDispatch();
  if (!element) return null;
  return (
    <div
      style={{ marginLeft: 10 }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dispatch(handleElementClick(element.source));
      }}
    >
      <div
        style={{
          border:
            selectedElement?.id === element.source.id
              ? `1px solid red`
              : "none",
        }}
      >
        {element.source?.name || element.source?.type || "root"}
      </div>
      {element.elements &&
        element.elements.map((child, index) => (
          <TreeComponent key={index} element={child} />
        ))}
    </div>
  );
};

const TreeWrapper = () => {
  const templateJSON = useSelector(getCreatomateState);
  return <TreeComponent element={templateJSON} />;
};

const PreviewWrapper = () => {
  const preview = useRef(null);
  const previewElement = useRef(null);
  const [isReaderReady, setIsReaderReady] = useState(false);
  const templateJSON = useSelector(getTemplateJSON);
  const overrides = useSelector(getOverrides);
  const selectedElementId = useSelector(getSelectedElementId);
  const dispatch = useDispatch();

  useEffect(() => {
    previewEmitter.on("play", () => {
      if (isReaderReady) {
        preview.current.play();
      }
    });
    previewEmitter.on("pause", () => {
      if (isReaderReady) {
        preview.current.pause();
      }
    });
    previewEmitter.on("setTime", ({ time }) => {
      if (isReaderReady) {
        preview.current.setTime(time);
      }
    });
    previewEmitter.on("updateElement", async ({ id, props }) => {
      if (isReaderReady) {
        const state = await preview.current.getSource();
        const newState = produce(
          state,
          (draftState) => {
            const element = findNestedElementById(draftState, id);
            _.each(props, (value, key) => {
              _.set(element, key, value);
            });
          },
          (patches, inversePatches) => {
            changes.push(patches);
            inverseChanges.push(inversePatches);
          },
        );
        await preview.current.setSource(newState, true);
      }
    });
    previewEmitter.on("deleteElement", async (element) => {
      if (isReaderReady) {
        const state = await preview.current.getSource();
        const newState = produce(
          state,
          (draftState) => {
            const parentElement = findNestedParentById(draftState, element.id);
            parentElement.elements = parentElement.elements.filter(
              (item) => item.id !== element.id,
            );
          },
          (patches, inversePatches) => {
            changes.push(patches);
            inverseChanges.push(inversePatches);
          },
        );
        await preview.current.setSource(newState, true);
      }
    });
    previewEmitter.on("addTextElement", async (element) => {
      if (isReaderReady) {
        const state = await preview.current.getSource();
        const newState = produce(
          state,
          (draftState) => {
            const sourceElement = findNestedElementById(draftState, element.id);
            sourceElement.elements.push({
              id: createUniqueId(),
              type: "text",
              track: 3,
              fill_color: "#838383",
              text: "Your text here",
            });
          },
          (patches, inversePatches) => {
            changes.push(patches);
            inverseChanges.push(inversePatches);
          },
        );
        await preview.current.setSource(newState, true);
      }
    });
    previewEmitter.on("updateState", async (state) => {
      if (isReaderReady) {
        await preview.current.setSource(state);
      }
    });
    return () => {
      previewEmitter.all.clear();
    };
  }, [isReaderReady, overrides]);

  useEffect(() => {
    const _preview = new Preview(
      previewElement.current,
      "interactive",
      process.env.NEXT_PUBLIC_VIDEO_PLAYER_TOKEN,
    );
    preview.current = _preview;
    _preview.onReady = async () => {
      setIsReaderReady(true);
      await _preview.setZoom("auto");
      await _preview.setSource(templateJSON);
    };
    _preview.onActiveElementsChange = async (elements) => {
      const element = elements[0];
      dispatch(setActiveElementId(element));
    };
    _preview.onTimeChange = async (time) => {
      dispatch(setGlobalTime(time));
    };
    _preview.onPlay = async () => {
      dispatch(setIsPlaying(true));
    };
    _preview.onPause = async () => {
      dispatch(setIsPlaying(false));
    };
    _preview.onStateChange = _.debounce((state) => {
      dispatch(setCreatomateState(state));
    });
  }, [dispatch, templateJSON]);

  useEffect(() => {
    if (preview.current && isReaderReady) {
      preview.current.onActiveCompositionChange = (elementId) => {
        dispatch(setActiveCompositionId(elementId));
      };
    }
  }, [isReaderReady, dispatch]);

  useEffect(() => {
    if (preview.current && isReaderReady) {
      preview.current.applyModifications(overrides).then(() => {
        // console.log(resp)
      });
    }
  }, [overrides, isReaderReady]);

  useEffect(() => {
    if (preview.current && isReaderReady) {
      preview.current.setActiveElements([selectedElementId]).then(() => {
        const element = preview.current.findElement((item) => {
          return item.source.id === selectedElementId;
        });
        if (element) {
          preview.current.setTime(element.globalTime + 0.5);
        }
      });
    }
  }, [selectedElementId, isReaderReady, dispatch]);

  return (
    <div style={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
      <div
        ref={previewElement}
        style={{ flexGrow: 1, backgroundColor: "red" }}
      ></div>
      <PreviewToolBar />
    </div>
  );
};

const PreviewToolBar = () => {
  const isPlaying = useSelector(getIsPlaying);
  return (
    <div style={{ height: 50 }}>
      <button
        onClick={() => {
          previewEmitter.emit(isPlaying ? "pause" : "play");
        }}
      >
        {isPlaying ? "pause" : "play"}
      </button>
    </div>
  );
};

const FormElement = ({ property }) => {
  const selectedElement = useSelector(getSelectedElement);
  const elementRef = useRef(null);
  const defaultValue = _.get(selectedElement, property);
  const [value, setValue] = useState(defaultValue);
  useEffect(() => {
    setValue(property.value);
  }, [property.value]);
  if (selectedElement[property] === undefined) {
    return null;
  }
  return (
    <div key={selectedElement.id}>
      <input
        ref={elementRef}
        name={property}
        defaultValue={defaultValue}
        onChange={(e) => {
          setValue(e.target.value);
        }}
      />
      <button
        onClick={() => {
          previewEmitter.emit("updateElement", {
            id: selectedElement.id,
            props: {
              [property]: value,
            },
          });
        }}
      >
        update
      </button>
    </div>
  );
};

const AddTextButton = () => {
  const selectedElement = useSelector(getSelectedElement);
  if (!selectedElement) return null;
  if (selectedElement.type === "composition") {
    return (
      <div>
        <button
          onClick={() => {
            previewEmitter.emit("addTextElement", selectedElement);
          }}
        >
          add text
        </button>
      </div>
    );
  }
  return null;
};

const DeleteElementButton = () => {
  const selectedElement = useSelector(getSelectedElement);
  if (!selectedElement) return null;
  return (
    <div>
      <button
        onClick={() => {
          previewEmitter.emit("deleteElement", selectedElement);
        }}
      >
        delete
      </button>
    </div>
  );
};

const SelectedPreview = () => {
  const selectedElement = useSelector(getSelectedElement);
  if (!selectedElement) return null;
  return (
    <>
      <FormElement property={"text"} />
      <FormElement property={"source"} />
      <div>
        <AddTextButton />
        <DeleteElementButton />
      </div>
      <pre>{JSON.stringify(selectedElement, null, 2)}</pre>
    </>
  );
};

const timeLineScale = 40;
const Timeline = () => {
  const dispatch = useDispatch();
  const selectedElementId = useSelector(getSelectedElementId);
  const { tracks, duration } = useSelector(getTimelineTracks);
  const time = useSelector(getGlobalTime);
  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        backgroundColor: "#000000",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          position: "relative",
          height: 40,
          backgroundColor: "blue",
          width: duration * timeLineScale,
        }}
        onClick={(e) => {
          previewEmitter.emit("setTime", {
            time: e.nativeEvent.layerX / timeLineScale,
          });
        }}
      >
        <div
          style={{
            position: "absolute",
            left: time * timeLineScale,
            backgroundColor: "red",
            width: 10,
            height: 40,
          }}
        ></div>
      </div>
      {tracks.map((trackElements, index) => {
        const firstTrack = _.first(trackElements);
        return (
          <div
            key={"track" + index}
            style={{ position: "relative", height: 40 }}
          >
            <div>Track {firstTrack.track}</div>
            {trackElements.map((element, index) => {
              const selected = selectedElementId === element.source.id;
              return (
                <div
                  style={{
                    position: "absolute",
                    left: element.time * timeLineScale,
                    width: element.duration * timeLineScale,
                    border: "1px solid #fff",
                    borderColor: selected ? "red" : "#fff",
                    borderRadius: 10,
                  }}
                  onClick={() => {
                    dispatch(setActiveElementId(element.source.id));
                  }}
                  key={"ele-" + index}
                >
                  {element.source.name || element.source.type || "root"}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
const Page = () => {
  return (
    <Provider store={store}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            height: "100%",
            alignItems: "stretch",
            overflow: "hidden",
            justifyContent: "flex-start",
          }}
        >
          <div style={{ width: 300, overflow: "auto" }}>
            <TreeWrapper />
          </div>
          <PreviewWrapper />
          <div style={{ width: 300, overflow: "auto" }}>
            <SelectedPreview />
          </div>
        </div>
        <div style={{ height: 300, overflow: "auto" }}>
          <Timeline />
        </div>
      </div>
    </Provider>
  );
};

export default Page;
