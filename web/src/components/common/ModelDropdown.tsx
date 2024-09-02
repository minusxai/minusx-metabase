import { Select } from '@chakra-ui/react';
import React from 'react';
// import { updateModel } from '../../state/settings/reducer';
import { useSelector } from 'react-redux';
import { dispatch } from '../../state/dispatch';

const ModelDropdown = () => {
  // // TODO(@arpit): removed this for now since handling it as a static value and not exposign to user
  // const model = useSelector(state => state.settings.model)

  // return (
  //   // Chakra UI Select component
  //   <Select
  //     value={model || ''}
  //     onChange={(e) => {
  //       // return dispatch(updateModel({ model: e.target.value }));
  //     }}
  //   >
  //     {/* <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option> */}
  //     {/* <option value="gpt-3.5-turbo-0125">GPT-3.5 Turbo (16k)</option> */}
  //     <option value="gpt-3.5-turbo-1106">GPT-3.5 Turbo (16k)</option>
  //     <option value="gpt-4-turbo">GPT-4 Turbo</option>
  //     <option value="gpt-4-1106-preview">GPT-4 Turbo (1106)</option>
  //     <option value="gpt-4o">GPT-4O</option>
  //   </Select>
  // );
};

export default ModelDropdown;
