import { useField } from "formik";
import { Input, Typography } from "antd";

const { Text } = Typography;

export default function NodeDescriptionField() {
  const [field, , helpers] = useField("desc");

  const onChange = (event) => {
    helpers.setValue(event.target.value);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <Text strong>Description:</Text>
      <Input.TextArea
        id="desc"
        {...field}
        rows={4}
        onChange={onChange}
        value={field.value}
      />
    </div>
  );
}
