import {
  combineReducers,
  configureStore,
  createSelector,
  createSlice,
} from "@reduxjs/toolkit";
import templateJSON from "@/app/video/template.json";
import _ from "lodash";
import jsonDiff from "json-diff";

export const getAllElementSource = (state) => {
  const elements = [];
  const findElements = (element) => {
    if (element?.source?.id) {
      elements.push(element);
    }
    if (element.elements) {
      element.elements.forEach((child) => findElements(child));
    }
  };
  findElements(state);
  return elements;
};
export const findNestedElementById = (state, id) => {
  let foundElement = null;
  const findElement = (element) => {
    if (foundElement) return;
    if (element.id === id) {
      foundElement = element;
    } else {
      if (element.elements) {
        element.elements.forEach((child) => findElement(child));
      }
    }
  };
  findElement(state);
  return foundElement;
};
export const findNestedParentById = (state, id) => {
  let foundElement = null;
  let parentElement = null;
  const findElement = (element, parent) => {
    if (foundElement) return;
    if (element.id === id) {
      foundElement = element;
      parentElement = parent;
    } else {
      if (element.elements) {
        element.elements.forEach((child) => findElement(child, element));
      }
    }
  };
  findElement(state, null);
  return parentElement;
};
export const findNestedElementParentByIdV2 = (state, id) => {
  let foundElement = null;
  let parentElement = null;
  if (!state || !id) {
    return foundElement;
  }
  const findElement = (element, parent) => {
    if (foundElement) return;
    if (element.source.id === id) {
      foundElement = element;
      parentElement = parent;
    } else {
      if (element.elements) {
        element.elements.forEach((child) => findElement(child, element));
      }
    }
  };
  findElement(state, null);
  return parentElement;
};
const findNestedElementByIdV2 = (state, id) => {
  let foundElement = null;
  if (!state || !id) {
    return foundElement;
  }
  const findElement = (element) => {
    if (foundElement) return;
    if (element.source.id === id) {
      foundElement = element;
    } else {
      if (element.elements) {
        element.elements.forEach((child) => findElement(child));
      }
    }
  };
  findElement(state);
  return foundElement;
};

const previewInitialState = {
  isPlaying: false,
};
const previewSlice = createSlice({
  name: "preview",
  initialState: previewInitialState,
  reducers: {
    setIsPlaying: (state, action) => {
      state.isPlaying = action.payload;
    },
  },
});

const templateInitialState = {
  templateJSON: templateJSON,
};
const templateSlice = createSlice({
  name: "template",
  initialState: templateInitialState,
  reducers: {},
});

const timeLineInitialState = {
  globalTime: 0,
  creatomateFirstState: null,
  creatomateState: null,
  activeCompositionId: null,
};
const timeLineSlice = createSlice({
  name: "timeLine",
  initialState: timeLineInitialState,
  reducers: {
    setCreatomateState: (state, action) => {
      if (!state.creatomateFirstState) {
        state.creatomateFirstState = action.payload;
      }
      state.creatomateState = action.payload;
    },
    setActiveCompositionId: (state, action) => {
      state.activeCompositionId = action.payload;
    },
  },
});

const initialEditorState = {
  selectedElementId: null,
  globalTime: 0,
  overrides: {},
};

const editorSlice = createSlice({
  name: "editor",
  initialState: initialEditorState,
  reducers: {
    handleElementClick: (state, action) => {
      state.selectedElementId = action.payload.id;
    },
    setActiveElementId: (state, action) => {
      state.selectedElementId = action.payload;
    },
    setGlobalTime: (state, action) => {
      state.globalTime = action.payload;
    },
  },
});

export const { handleElementClick, setActiveElementId, setGlobalTime } =
  editorSlice.actions;
export const { setCreatomateState, setActiveCompositionId, deleteElement } =
  timeLineSlice.actions;

export const { setIsPlaying } = previewSlice.actions;
export const {} = templateSlice.actions;
export const store = configureStore({
  reducer: combineReducers({
    [editorSlice.name]: editorSlice.reducer,
    [templateSlice.name]: templateSlice.reducer,
    [timeLineSlice.name]: timeLineSlice.reducer,
    [previewSlice.name]: previewSlice.reducer,
  }),
});

const getFullState = (state) => state;
const getEditorState = (state) => state[editorSlice.name];
const getTemplateState = (state) => state[templateSlice.name];
const getTimeLineState = (state) => state[timeLineSlice.name];

const getPreviewState = (state) => state[previewSlice.name];

const getSelectedElementState = (state) => {
  const editorState = state[editorSlice.name];
  const createomateState = state[timeLineSlice.name].creatomateState;
  const selectedElement = findNestedElementByIdV2(
    createomateState,
    editorState.selectedElementId,
  );
  if (selectedElement) {
    return selectedElement.source;
  }
  return null;
};
export const getTemplateJSON = createSelector(
  getTemplateState,
  (state) => state.templateJSON,
);
export const getSelectedElement = createSelector(
  getFullState,
  getSelectedElementState,
);

export const getSelectedElementId = createSelector(
  getEditorState,
  (state) => state.selectedElementId,
);
export const getOverrides = createSelector(
  getEditorState,
  (state) => state.overrides,
);
export const getGlobalTime = createSelector(
  getEditorState,
  (state) => state.globalTime,
);

export const getTimelineTracks = createSelector(getTimeLineState, (state) => {
  if (!state.creatomateState)
    return {
      tracks: [],
      duration: 0,
    };
  let sourceElements = state.creatomateState.elements;
  if (state.activeCompositionId) {
    const activeElement = findNestedElementByIdV2(
      state.creatomateState,
      state.activeCompositionId,
    );
    if (activeElement) {
      sourceElements = activeElement.elements;
    }
  }
  const groupedTracks = _.groupBy(sourceElements, "track");
  return {
    duration: state.creatomateState.duration,
    tracks: _.values(groupedTracks),
    undo: state.creatomateState.undo,
    redo: state.creatomateState.redo,
  };
});

export const getIsPlaying = createSelector(getPreviewState, (state) => {
  return state.isPlaying;
});

export const getCreatomateState = createSelector(getTimeLineState, (state) => {
  return state.creatomateState;
});

const getItemId = (item) => {
  return item.source.id;
};
const populateOverrides = (state, diff = {}) => {
  console.log(diff, "diff");
  const overrides = {};
  const deletes = [];
  const additions = [];
  const updateOverrides = ([change, element], path) => {
    if (change === " ") {
      return;
    }
    const stateCopy = _.get(state, path);
    if (change === "~") {
      if (stateCopy) {
        const elementOverrides = {};
        const id = getItemId(stateCopy);
        const propsToCopy = _.keys(element.source);
        _.each(propsToCopy, (propKey) => {
          const [key, action] = propKey.split("__");
          const value = element.source[propKey];
          if (action === "added") {
            _.set(elementOverrides, key, value);
          } else if (action === undefined) {
            if (value?.__new !== undefined) {
              _.set(elementOverrides, key, value?.__new);
            }
          }
        });
        if (!_.isEmpty(elementOverrides)) {
          overrides[id] = elementOverrides;
        }
      }
    }
    if (change === "+") {
      additions.push({ source: element.source, path });
    }
    if (change === "-") {
      deletes.push(element.source.id);
    }
    if (element && element.elements) {
      element.elements.forEach((child, index) =>
        updateOverrides(child, `${path}.elements.${index}`),
      );
    }
  };
  diff.elements?.forEach((item, index) =>
    updateOverrides(item, "elements." + index),
  );
  return {
    deletes,
    overrides,
    additions,
  };
};
export const getCreatomateOverrides = createSelector(
  getTimeLineState,
  (state) => {
    if (state.creatomateFirstState) {
      // const elements = getAllElementSource(state.creatomateFirstState);
      // const elements2 = getAllElementSource(state.creatomateState);
      // const elementIndex1 = _.keyBy(elements, getItemId);
      // const elementIndex2 = _.keyBy(elements2, getItemId);
      // const overrides = {};
      // _.each(elements, (item) => {
      //   const id = getItemId(item);
      //   const diff = jsonDiff.diff(elementIndex1[id], elementIndex2[id]);
      //   console.log(elementIndex1[id], elementIndex2[id], diff);
      //   if (diff) {
      //     overrides[id] = diff;
      //   }
      // });
      // return overrides;
      const time = Date.now();
      const diff = jsonDiff.diff(
        state.creatomateFirstState,
        state.creatomateState,
      );
      console.log(Date.now() - time);
      return populateOverrides(state.creatomateFirstState, diff);
    }
    return {};
  },
);
