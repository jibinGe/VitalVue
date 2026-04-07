import { createSlice } from "@reduxjs/toolkit";

const DropdownSlice = createSlice({
    name: 'dropdown',
    initialState: {
        openDropdown: null,
    },
    reducers: {
        setOpenDropdown(state, action) {
            state.openDropdown = action.payload;
        },
        closeDropdown(state) {
            state.openDropdown = null
        }
    }
})
export const { setOpenDropdown, closeDropdown } = DropdownSlice.actions;
export default DropdownSlice.reducer;