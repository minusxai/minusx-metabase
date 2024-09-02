export const JupyterStateSchema = {
  "type": "object",
  "description": "The state of a jupyter notebook",
  "properties": {
    "cells": {
      "type": "array",
      "description": "The cells in the notebook",
      "items": [
        {
          "type": "object",
          "description": "A cell in the notebook",
          "properties": {
            "source": {
              "type": "string",
              "description": "The source code of the cell"
            },
            "isSelected": {
              "type": "boolean",
              "description": "Whether the cell is currently selected."
            },
            "index": {
              "type": "integer",
              "description": "The index of the cell"
            },
            "output": {
              "type": "array",
              "description": "The outputs of the cell",
              "items": [
                {
                  "type": "object",
                  "description": "An output of the cell",
                  "properties": {
                    "type": {
                      "type": "string",
                      "description": "The type of the output: text, dataframe, plot"
                    },
                    "value": {
                      "type": "string",
                      "description": "The value of the output"
                    }
                  },
                  "required": [
                    "type",
                    "value"
                  ]
                }
              ]
            },
            "isInViewport": {
              "type": "boolean",
              "description": "Whether the cell is currently in the viewport"
            },
            "isExecuting": {
              "type": "boolean",
              "description": "Whether the cell is currently executing"
            },
            "cellType": {
              "type": "string",
              "description": "The type of the cell: code, markdown, etc."
            }
          },
          "required": [
            "source",
            "isSelected",
            "output",
            "isInViewport",
            "isExecuting",
            "cellType"
          ]
        }
      ]
    }
  },
  "required": [
    "cells"
  ]
}