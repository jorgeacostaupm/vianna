import { useState } from "react";
import { Button, Modal, Tooltip } from "antd";
import { QuestionCircleOutlined } from "@ant-design/icons";

import buttonStyles from "@/components/ui/PopoverButton.module.css";
import CustomFormulaHelp from "./CustomFormulaHelp";
import styles from "./CustomFormulaHelpModalButton.module.css";

export default function CustomFormulaHelpModalButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Tooltip title="Custom Operations Help">
        <Button
          size="small"
          className={buttonStyles.menuButton}
          icon={<QuestionCircleOutlined />}
          onClick={() => setOpen(true)}
          aria-label="Open custom operations help"
        />
      </Tooltip>
      <Modal
        title="Custom Operations Help"
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        destroyOnClose
        centered
        width="fit-content"
        className={styles.helpModal}
      >
        <CustomFormulaHelp />
      </Modal>
    </>
  );
}
