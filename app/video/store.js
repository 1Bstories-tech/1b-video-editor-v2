import {
  combineReducers,
  configureStore,
  createSelector,
  createSlice,
} from "@reduxjs/toolkit";
import templateJSON from "@/app/video/template.json";
import _ from "lodash";

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
  creatomateState: null,
  previousCreatomateState: null,
  activeCompositionId: null,
};
const timeLineSlice = createSlice({
  name: "timeLine",
  initialState: timeLineInitialState,
  reducers: {
    setCreatomateState: (state, action) => {
      if (state.creatomateState === null) {
        state.previousCreatomateState = action.payload;
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
    updateElementText: (state, action) => {
      state.overrides[`${action.payload.id}.text`] = action.payload.text;
    },
    setGlobalTime: (state, action) => {
      state.globalTime = action.payload;
    },
  },
});

export const {
  handleElementClick,
  updateElementText,
  setActiveElementId,
  setGlobalTime,
} = editorSlice.actions;
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
export const getTemplateJSON = createSelector(
  getTemplateState,
  (state) => state.templateJSON,
);
export const getSelectedElement = createSelector(getFullState, (state) => {
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
});

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

export const getOverridesToSave = createSelector(getTimeLineState, (state) => {
  return [];
});

export const getIsPlaying = createSelector(getPreviewState, (state) => {
  return state.isPlaying;
});
export const getBreadCrumbs = createSelector(getTimeLineState, (state) => {
  return [];
});

export const getCreatomateState = createSelector(getTimeLineState, (state) => {
  return state.creatomateState;
});
