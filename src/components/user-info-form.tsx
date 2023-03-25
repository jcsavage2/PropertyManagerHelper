type UserInfoFormProps = {
  name: string
  setName: any
  handleNameChange: any
}

export const UserInfoForm = ({
  name,
  setName,
  handleNameChange
}: UserInfoFormProps
) => {

  return (
    <form onSubmit={() => console.log("weee")}>
      <input
        type={"text"}
        value={name}
        onChange={handleNameChange}
      />
      <button type="submit">Try</button>
    </form>
  )
}