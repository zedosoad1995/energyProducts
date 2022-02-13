import Checkbox from "@material-ui/core/Checkbox";
import InputLabel from "@material-ui/core/InputLabel";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import MenuItem from "@material-ui/core/MenuItem";
import FormControl from "@material-ui/core/FormControl";
import Select from "@material-ui/core/Select";
import _ from 'lodash';

import { useState } from 'react';

import { MenuProps, useStyles } from "../utils";

export function CheckboxList({handleCheckboxChange, items, selectedItems, orderByName=false}){

    const classes = useStyles();
    const [selected, setSelected] = useState([]);

    // Only load on the 1st time it has an array with length > 0
    if(!_.isEqual(selectedItems, selected) && selectedItems && selected.length === 0){
        setSelected(selectedItems);
    }

    function handleChange(event){
        const value = event.target.value;
        setSelected(value);
    };

    function sortList(a, b){
        if(selected.length > 0){
            if(!selected.includes(a) && selected.includes(b)){
                return 1;
            }else if(selected.includes(a) && !selected.includes(b)){
                return -1;
            }
        }
        if(a > b){
            return 1;
        }else if(a < b){
            return -1;
        }
        return 0;
    }

    if(orderByName) items.sort(sortList);

    return (
        <FormControl className={classes.formControl}>
            <InputLabel id="mutiple-select-label">Multiple Select</InputLabel>
            <Select
                labelId="mutiple-select-label"
                multiple
                value={selected}
                onChange={handleChange}
                renderValue={(selected) => selected.join(", ")}
                MenuProps={MenuProps}
            >
                {items.map((option) => {
                    const key = (Array.isArray(option)) ? option[0] : option;
                    const cnt = (Array.isArray(option) && option.length > 1) ? ` (${option[1]})` : '';

                    return (
                        <MenuItem onChange={handleCheckboxChange} key={key} value={key}>
                            <ListItemIcon>
                                <Checkbox checked={selected.indexOf(key) > -1} />
                            </ListItemIcon>
                            <ListItemText primary={`${key}${cnt}`} />
                        </MenuItem>
                    );
                })}
            </Select>
        </FormControl>
        );
}