import React from 'react'

import {
  GroupBase,
  Select,
  SelectComponentsConfig,
  chakraComponents,
} from 'chakra-react-select';

import {
  Tooltip,
} from '@chakra-ui/react'

interface Option {
  label: string;
  value: string;
  description?: string;
}

export const components: SelectComponentsConfig<Option, true, GroupBase<Option>> = {
  Option: ({ children, ...props }) => {
    return (
      <chakraComponents.Option {...props}>
        <Tooltip label={props.data.description} placement="top" hasArrow maxWidth={200}>
          <span>{children}</span>
        </Tooltip>
      </chakraComponents.Option>
    );
  },
  MultiValueLabel: ({ children, ...props }) => {
    return (
      <chakraComponents.MultiValueLabel {...props}>
        <Tooltip label={JSON.stringify(props.data.value)} placement="top" hasArrow maxWidth={200}>
          <span>{children}</span>
        </Tooltip>
      </chakraComponents.MultiValueLabel>
    );
  },
};

export const createAvailableOptions = (members: any[]) => members.map((member: any) => ({ value: member.name, label: member.name, description: member.description }))
