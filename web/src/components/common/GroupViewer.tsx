import React, { useState } from "react"
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Heading,
  Text,
  Badge,
  Select,
  Input,
  Button,
  IconButton,
  HStack,
  VStack,
} from "@chakra-ui/react"
import { useSelector } from "react-redux"
import { RootState } from '../../state/store';
import { CloseIcon } from "@chakra-ui/icons"
import { configs } from "../../constants";
import axios from "axios";
import { refreshMemberships } from "./YAMLCatalog";

const makeGroupsAPICall = async (endpoint: string, data: object, baseURL?: string) => {
  baseURL = baseURL || configs.GROUPS_BASE_URL
  const url = `${baseURL}/${endpoint}`
  const response = await axios.post(url, data, {
      headers: {
          'Content-Type': 'application/json',
      },
  });
  return response.data;
}

export const GroupViewer: React.FC = () => {
  const groups = useSelector((state: RootState) => state.settings.groups)
  const users = useSelector((state: RootState) => state.settings.users)
  const currentUserId = useSelector((state: RootState) => state.auth.profile_id)
  const assets = useSelector((state: RootState) => state.settings.availableCatalogs)

  const groupList = Object.values(groups)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedGroupId, setSelectedGroupId] = useState(groupList[0]?.id || null)
  const [newUserEmail, setNewUserEmail] = useState("")
  const [selectedAssetId, setSelectedAssetId] = useState("")
  const [newGroupName, setNewGroupName] = useState("")

  const selectedGroup = selectedGroupId ? groups[selectedGroupId] : null
  const isOwner = selectedGroup?.owner === currentUserId

  const members: { id: string; permission: string }[] = selectedGroup
    ? [
        { id: selectedGroup.owner, permission: "owner" },
        ...selectedGroup.members.filter((m) => m.id !== selectedGroup.owner),
      ]
    : []

  const handleAddUser = async () => {
    if (!newUserEmail) return
    setIsLoading(true)
    await makeGroupsAPICall(
      "add_person",
      { group_id: selectedGroupId, email_id: newUserEmail },
      configs.GROUPS_BASE_URL
    )
    await refreshMemberships(currentUserId)
    setIsLoading(false)
    setNewUserEmail("")
  }

  const handleRemoveUser = async (email_id: string) => {
    setIsLoading(true)
    await makeGroupsAPICall(
      "remove_person",
      { group_id: selectedGroupId, email_id },
      configs.GROUPS_BASE_URL
    )
    await refreshMemberships(currentUserId)
    setIsLoading(false)
  }

  const handleShareAsset = async () => {
    if (!selectedAssetId) return
    setIsLoading(true)
    await makeGroupsAPICall(
      "add_asset",
      { group_id: selectedGroupId, asset_id: selectedAssetId },
      configs.GROUPS_BASE_URL
    )
    await refreshMemberships(currentUserId)
    setIsLoading(false)
    setSelectedAssetId("")
  }

  const handleRemoveSharedAsset = async (assetId: string) => {
    setIsLoading(true)
    await makeGroupsAPICall(
      "remove_asset",
      { group_id: selectedGroupId, asset_id: assetId },
      configs.GROUPS_BASE_URL
    )
    await refreshMemberships(currentUserId)
    setIsLoading(false)
  }

  const deleteGroup = async (selectedGroupId: string) => {
    setIsLoading(true)
    await makeGroupsAPICall(
      "delete",
      { group_id: selectedGroupId },
      configs.GROUPS_BASE_URL
    )
    await refreshMemberships(currentUserId)
    setIsLoading(false)
  }

  const createNewGroup = async (groupName: string) => {
    setIsLoading(true)
    await makeGroupsAPICall(
      "",
      { name: groupName },
      configs.GROUPS_BASE_URL
    )
    await refreshMemberships(currentUserId)
    setIsLoading(false)
  }


  // Assets owned by the user
  const ownedAssets = assets.filter(a => a.owner === currentUserId)

  // Owned assets already shared to the selected group
  const sharedAssetsToGroup = selectedGroupId
    ? ownedAssets.filter(a => a.primaryGroup === selectedGroupId)
    : []

  // Owned assets NOT yet shared to the selected group
  const availableToShare = ownedAssets.filter(
    a => a.primaryGroup !== selectedGroupId
  )

  return (
    <Box>
      <Heading size="md" mb={4}>Group Viewer {isLoading ? "Loading..." : ""}</Heading>

      {groupList.length === 0 ? (
        <Text>No groups available.</Text>
      ) : (
        <>
          <HStack mb={4}>
            <Button colorScheme="blue" onClick={() => createNewGroup(newGroupName)}>
              Create Group
            </Button>
            <Input
              placeholder="New group name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
            />
          </HStack>
          <Select
            mb={4}
            value={selectedGroupId || ""}
            onChange={(e) => setSelectedGroupId(e.target.value)}
          > 
            {groupList.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </Select>

          {/* 👥 Members Table */}
          <TableContainer mb={6}>
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>Email</Th>
                  <Th>Permission</Th>
                  {isOwner && <Th textAlign="right">Actions</Th>}
                </Tr>
              </Thead>
              <Tbody>
                {members.map((member) => {
                  const user = users[member.id]
                  const isCurrentUser = member.id === currentUserId
                  const isGroupOwner = member.permission === "owner"

                  return (
                    <Tr key={member.id}>
                      <Td fontWeight={isCurrentUser ? "bold" : "normal"} color={isCurrentUser ? "blue.600" : "gray.800"}>
                        {user?.email_id || member.id}
                        {isCurrentUser && <Badge colorScheme="blue" ml={2}>You</Badge>}
                      </Td>
                      <Td>
                        <Badge
                          colorScheme={
                            member.permission === "owner" ? "green" :
                            member.permission === "admin" ? "purple" : "blue"
                          }
                        >
                          {member.permission}
                        </Badge>
                      </Td>
                      {isOwner && !isGroupOwner && (
                        <Td textAlign="right">
                          <IconButton
                            aria-label="Remove user"
                            icon={<CloseIcon />}
                            size="xs"
                            variant="ghost"
                            colorScheme="red"
                            onClick={() => handleRemoveUser(user?.email_id)}
                          />
                        </Td>
                      )}
                    </Tr>
                  )
                })}
              </Tbody>
            </Table>
          </TableContainer>

          {isOwner && (
            <VStack align="stretch" spacing={6}>
              {/* ➕ Add User */}
              <HStack>
                <Input
                  placeholder="Add user by email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                />
                <Button onClick={handleAddUser} colorScheme="green">Add</Button>
              </HStack>

              {/* 📤 Share Asset */}
              <HStack>
                <Select
                  placeholder="Select asset to share"
                  value={selectedAssetId}
                  onChange={(e) => setSelectedAssetId(e.target.value)}
                >
                  {availableToShare.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name}
                    </option>
                  ))}
                </Select>
                <Button onClick={handleShareAsset} colorScheme="blue">Share</Button>
              </HStack>

              {/* 📄 Shared Assets Table */}
              {sharedAssetsToGroup.length > 0 && (
                <Box>
                  <Heading size="sm" mb={2}>Shared Assets</Heading>
                  <TableContainer>
                    <Table variant="simple" size="sm">
                      <Thead>
                        <Tr>
                          <Th>Asset Name</Th>
                          <Th>DB</Th>
                          <Th textAlign="right">Actions</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {sharedAssetsToGroup.map(asset => (
                          <Tr key={asset.id}>
                            <Td>{asset.name}</Td>
                            <Td>{asset.dbName}</Td>
                            <Td textAlign="right">
                              <IconButton
                                aria-label="Unshare"
                                icon={<CloseIcon />}
                                size="xs"
                                variant="ghost"
                                colorScheme="red"
                                onClick={() => handleRemoveSharedAsset(asset.id)}
                              />
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
              <Button colorScheme="red" onClick={() => deleteGroup(selectedGroupId)}>
                Delete Group
              </Button>
            </VStack>
          )}
        </>
      )}
    </Box>
  )
}
