

const WorkOrder = ({ workOrderId }: { workOrderId: string; }) => {
  return (
    <div style={{
      width: "20%",
      height: "20%",
      backgroundColor: "darkcyan",
      fontSize: "18px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      I am the work order: {workOrderId}
    </div >
  );
};

export default WorkOrder;