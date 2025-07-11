<template>
  <div class="common-layout">
    <el-container>
        
      <!-- 主体容器 -->
      <el-container>
        <el-main>
            <el-header style="display: flex; justify-content: center; align-items: center;">
            好友列表
            </el-header>
          <!-- 表格部分 -->
          <el-table :data="tableData" style="width: 100%">
            <el-table-column prop="date" label="Date"  />
            <el-table-column prop="name" label="Name"  />
            <el-table-column prop="address" label="Address" />
          </el-table>
        </el-main>

        <!-- 右侧 aside -->
        <el-aside width="200px" class="right-aside">
          功能列表
        </el-aside>
      </el-container>

      
      
    </el-container>
  </div>
</template>

<style scoped>
.common-layout {
  display: flex;
  justify-content: center;
  min-height: 100vh;
}

.el-container {
  width: 80%;
  max-width: 1200px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  background-color: #fff;
  border-radius: 8px;
  overflow: hidden;
}

/* 设置右侧 aside 样式 */
.right-aside {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  padding-top: 40px;
  background-color: #e9eef3;
  color: #333;
}

/* 如果需要调整 main 和 aside 的宽度比例 */
.el-main {
  flex: 3;
}

.right-aside {
  flex: 1;
}
</style>