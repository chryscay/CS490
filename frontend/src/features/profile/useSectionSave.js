import { useState } from 'react';

// save(values) must resolve to either { values } (success) or
// { fieldErrors } (server validation), and throw on failure.
export default function useSectionSave({ initialValues, validate, save }) {
  const [values, setValues] = useState(initialValues);
  const [initial, setInitial] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | saving | saved | error
  const [saveError, setSaveError] = useState('');

  const isDirty = JSON.stringify(values) !== JSON.stringify(initial);

  function setValue(name, value) {
    setValues((prev) => ({ ...prev, [name]: value }));
    if (status === 'saved') setStatus('idle');
  }

  function reset(next) {
    const v = next ?? initial;
    setValues(v);
    setInitial(v);
    setErrors({});
    setStatus('idle');
    setSaveError('');
  }

  async function handleSubmit(e) {
    if (e?.preventDefault) e.preventDefault();

    const clientErrors = validate ? validate(values) : {};
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) return;

    try {
      setStatus('saving');
      setSaveError('');
      const result = await save(values);

      if (result?.fieldErrors) {
        setErrors(result.fieldErrors);
        setStatus('idle');
        return;
      }

      const saved = result?.values ?? values;
      setValues(saved);
      setInitial(saved);
      setErrors({});
      setStatus('saved');
    } catch {
      setStatus('error');
      setSaveError('We could not save this section. Please try again.');
    }
  }

  return {
    values, setValue, setValues, errors, status, saveError,
    isDirty, handleSubmit, reset,
  };
}