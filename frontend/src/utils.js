import { makeStyles } from "@material-ui/core/styles";
import { useRef, useEffect } from 'react';

const useStyles = makeStyles((theme) => ({
  formControl: {
    margin: theme.spacing(1),
    width: 300
  },
  indeterminateColor: {
    color: "#f50057"
  },
  selectAllText: {
    fontWeight: 500
  },
  selectedAll: {
    backgroundColor: "rgba(0, 0, 0, 0.08)",
    "&:hover": {
      backgroundColor: "rgba(0, 0, 0, 0.08)"
    }
  }
}));

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250
    }
  },
  getContentAnchorEl: null,
  anchorOrigin: {
    vertical: "bottom",
    horizontal: "center"
  },
  transformOrigin: {
    vertical: "top",
    horizontal: "center"
  },
  variant: "menu"
};

function getColumnNames(columns, columnNames = []){
  for(let i = 0; i < columns.length; i++){
      const obj = columns[i];

      if('columns' in obj){
          getColumnNames(obj['columns'], columnNames);
      }else if('accessor' in obj){
          columnNames.push(obj['accessor']);
      }
  }

  return columnNames;
}

export { useStyles, MenuProps, getColumnNames };
