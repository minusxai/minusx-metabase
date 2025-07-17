import React, {FC, useEffect, useState, useRef, useCallback, useMemo, Suspense} from 'react';
import { Box, Spinner } from '@chakra-ui/react';

// Lazy load Monaco Editor and related modules
const LazyEditor = React.lazy(() => import("@monaco-editor/react"));

// Dynamic imports for Monaco setup
const loadMonaco = async () => {
  const [monaco, { configureMonacoYaml }, yamlWorker] = await Promise.all([
    import("monaco-editor"),
    import('monaco-yaml'),
    import("./yaml.worker.js?worker")
  ]);
  return { monaco, configureMonacoYaml, yamlWorker };
};

// Global configuration to prevent multiple setups
let yamlConfigured = false;
let stylesInjected = false;
let monacoLoaded = false;

const configureYamlOnce = async (schemaUri?: string) => {
    if (yamlConfigured) return;
    
    const { monaco, configureMonacoYaml, yamlWorker } = await loadMonaco();
    
    // Configure Monaco environment
    if (!monacoLoaded) {
        // @ts-ignore
        window.MonacoEnvironment = {
            getWorker(moduleId: any, label: string) {
                switch (label) {
                    case 'yaml':
                        return new yamlWorker.default();
                    default:
                        throw new Error(`Unknown label ${label}`);
                }
            },
        };
        monacoLoaded = true;
    }
    
    const schemas = schemaUri ? [{
        uri: schemaUri,
        fileMatch: ['*'],
    }] : [];

    configureMonacoYaml(monaco, {
        enableSchemaRequest: true,
        hover: true,
        completion: true,
        validate: true,
        format: true,
        schemas
    });
    yamlConfigured = true;
};

const injectErrorStyles = () => {
    if (stylesInjected) return;
    const style = document.createElement('style');
    style.textContent = `
        .error-line-highlight {
            background-color: rgba(255, 0, 0, 0.1) !important;
        }
        .error-line-decoration {
            background-color: #ff0000 !important;
            width: 3px !important;
        }
    `;
    document.head.appendChild(style);
    stylesInjected = true;
};

interface CodeEditorProps {
    language: string;
    value: any;
    disabled?: boolean;
    onChange(value: string|undefined): void;
    onValidation(value: boolean): void;
    className?: string;
    width?: string;
    height?: string;
    schemaUri?: string;
}

export const CodeEditor: FC<CodeEditorProps> = (props) => {
    const {language, value, disabled, onChange, onValidation, className, width, height, schemaUri} = props;
    const [yamlErrors, setYamlErrors] = useState<string[]>([]);
    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const decorationsRef = useRef<string[]>([]);
    const lastMarkersRef = useRef<string>('');

    // Debounce onChange to reduce validation frequency
    const debouncedOnChange = useMemo(
        () => {
            let timeoutId: NodeJS.Timeout;
            return (value: string | undefined) => {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    onChange(value);
                }, 300); // 300ms debounce
            };
        },
        [onChange]
    );

    const handleOnChange = useCallback((value: string|undefined) => {
        debouncedOnChange(value);
    }, [debouncedOnChange]);

    const onValidate = useCallback(async (markers: any[]) => {
        const yamlMarkerErrors = markers.map((marker: any) => marker.message);
        setYamlErrors(yamlMarkerErrors);
        onValidation(markers.length > 0);
        
        // Create a signature of current markers to avoid unnecessary decoration updates
        const markersSignature = JSON.stringify(markers.map(m => ({ 
            startLineNumber: m.startLineNumber, 
            endLineNumber: m.endLineNumber,
            message: m.message 
        })));
        
        // Only update decorations if they actually changed
        if (editorRef.current && markersSignature !== lastMarkersRef.current) {
            const model = editorRef.current.getModel();
            if (!model) return;
            
            const { monaco } = await loadMonaco();
            
            const decorations = markers.map((marker: any) => {
                const lineLength = model.getLineLength(marker.startLineNumber) || 1;
                
                return {
                    range: new monaco.Range(
                        marker.startLineNumber, 
                        1, 
                        marker.endLineNumber || marker.startLineNumber, 
                        Math.max(lineLength, marker.endColumn || lineLength)
                    ),
                    options: {
                        isWholeLine: true,
                        className: 'error-line-highlight',
                        linesDecorationsClassName: 'error-line-decoration',
                        hoverMessage: {
                            value: marker.message
                        }
                    }
                };
            });
            
            decorationsRef.current = editorRef.current.deltaDecorations(
                decorationsRef.current, 
                decorations
            );
            lastMarkersRef.current = markersSignature;
        }
    }, [onValidation]);

    const handleEditorDidMount = useCallback(async (editor: any) => {
        editorRef.current = editor;
        injectErrorStyles();
        await configureYamlOnce(schemaUri);
    }, [schemaUri]);

    // Configure YAML once when component mounts
    useEffect(() => {
        configureYamlOnce(schemaUri);
    }, [schemaUri]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            // Cleanup any pending debounced calls
            const timeoutId = (debouncedOnChange as any).timeoutId;
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, [debouncedOnChange]);

    return (
        <div style={{border: "1px solid #ccc"}} className={className}>
            <Suspense fallback={
                <Box 
                    display="flex" 
                    alignItems="center" 
                    justifyContent="center" 
                    width={width} 
                    height={height}
                >
                    <Spinner size="md" />
                </Box>
            }>
                <LazyEditor
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
                        // Performance optimizations
                        wordWrap: 'off',
                        scrollBeyondLastLine: false,
                        renderLineHighlight: 'none',
                        occurrencesHighlight: 'off',
                        renderControlCharacters: false,
                        renderWhitespace: 'none',
                        automaticLayout: true,
                        // Reduce some visual overhead
                        hideCursorInOverviewRuler: true,
                        overviewRulerBorder: false,
                    }}
                    width={width}
                    height={height}
                    language={language}
                    value={value}
                    onValidate={onValidate}
                    onChange={handleOnChange}
                    onMount={handleEditorDidMount}
                />
            </Suspense>
        </div>
    );
};