import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../state/store';

const CUSTOM_CSS_ID = 'minusx-custom-css';

export const useCustomCSS = () => {
  const customCSS = useSelector((state: RootState) => state.settings.customCSS);

  useEffect(() => {
    // Remove existing custom CSS if it exists
    const existingStyle = document.getElementById(CUSTOM_CSS_ID);
    if (existingStyle) {
      existingStyle.remove();
    }

    // Add new custom CSS if it exists and is not empty
    if (customCSS && customCSS.trim()) {
      try {
        const styleElement = document.createElement('style');
        styleElement.id = CUSTOM_CSS_ID;
        styleElement.textContent = customCSS;
        
        // Add to head
        document.head.appendChild(styleElement);
        
        console.log('Custom CSS applied:', customCSS.length, 'characters');
      } catch (error) {
        console.error('Failed to apply custom CSS:', error);
        
        // If there's an error, remove the style element if it was created
        const erroredStyle = document.getElementById(CUSTOM_CSS_ID);
        if (erroredStyle) {
          erroredStyle.remove();
        }
      }
    }

    // Cleanup function
    return () => {
      const styleToRemove = document.getElementById(CUSTOM_CSS_ID);
      if (styleToRemove) {
        styleToRemove.remove();
      }
    };
  }, [customCSS]);

  return {
    isActive: customCSS && customCSS.trim().length > 0,
    cssLength: customCSS ? customCSS.length : 0
  };
};