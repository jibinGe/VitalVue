import { configureStore } from "@reduxjs/toolkit";
import dropdownReducer from './dropdown-slice'

export const Store = configureStore({
    reducer: {
        dropdown: dropdownReducer,
    }
})