import React, {FC, useEffect, useState} from 'react';
import * as monaco from "monaco-editor";
import Editor, { loader } from "@monaco-editor/react";
loader.config({ monaco });
import { configureMonacoYaml } from 'monaco-yaml'
import yamlWorker from "./yaml.worker.js?worker";

// @ts-ignore
window.MonacoEnvironment = {
    getWorker(moduleId: any, label: string) {
        switch (label) {
            case 'yaml':
                // @ts-ignore
                // return new Worker(new URL('monaco-yaml/yaml.worker', import.meta.url));
                return new yamlWorker();
            default:
                throw new Error(`Unknown label ${label}`);
        }
    },
};

interface CodeEditorProps {
    language: string;
    value: any;
    disabled?: boolean;
    onChange(value: string|undefined): void;
    className?: string;
    width?: string;
    height?: string;
}

export const CodeEditor: FC<CodeEditorProps> = (props) => {
    const {language, value, disabled, onChange, className, width, height} = props;
    const [yamlErrors, setYamlErrors] = useState<string[]>([]);

    const handleOnChange = (value: string|undefined) => {
        onChange(value);
    }
    const onValidate = (markers: any[]) => {
      const yamlMarkerErrors = markers.map((marker: any) => marker.message)
      setYamlErrors(yamlMarkerErrors)
  }

    useEffect(() => {
        configureMonacoYaml(monaco, {})
    }, [])

    return (
        <div style={{border: "1px solid #ccc"}} className={className}>
            {yamlErrors.map((yamlError, index) => <div key={index}>{yamlError}</div>)}
            <Editor
                options={{
                    readOnly: disabled,
                    lineDecorationsWidth: 5,
                    lineNumbersMinChars: 0,
                    glyphMargin: false,
                    folding: false,
                    lineNumbers: 'off',
                    minimap: {
                        enabled: false
                    },
                    fontSize: 11,
                }}
                width={width}
                height={height}
                language={language}
                value={value}
                onValidate={onValidate}
                onChange={handleOnChange}
            />
        </div>
    );
}